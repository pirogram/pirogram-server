'use strict';

const zmq = require('zeromq');
const uuidv4 = require('uuid/v4');
const StateMachine = require('javascript-state-machine');
const {logger} = require('./logger');
const {exec} = require('./subprocess');
const {fixConsole} = require('./jupyter-utils');

const EXECUTION_TIMEOUT = 15000;
const IDLE_TIMEOUT = 150000;
const JUPYTER_DELIM = '<IDS|MSG>';
const POOL_LOW_WATERMARK = 2;

const executors = {};
const available = [];


export class CodeExecutor {
    constructor() {
        this.id = uuidv4();
        executors[this.id] = this;

        this._fsm();
        this.spawn();
        this.connect();
    }

    static buildPool() {
        while(available.length < POOL_LOW_WATERMARK) {
            const executor = new CodeExecutor();
            available.push( executor);
        }
    }

    static get() {
        if( available.length == 0) { CodeExecutor.buildPool(); }

        const executor = available.shift();
        CodeExecutor.buildPool();
        return executor;
    }

    static getById(id) {
        return executors[id];
    }

    async spawn() {
        const cmd = 'docker';
        const args = ['run', '--rm', '-d', '--log-driver', 'fluentd',
            '--mount', `type=volume,source=pirogram-content,destination=/home/jupyter/content,readonly`,
            '--network', 'pirogram', '--name', `code-executor-${this.id}`,
            '--log-opt', `tag=docker.code-executor-${this.id}`, 'pirogram/pirogram-ipython'];
        await exec( cmd, args);

        logger.emit('code-executor', {type: 'code-executor-spawned', id: this.id});
    }
    
    connect() {
        const self = this;

        this.shellSocket = zmq.socket('dealer');
        this.shellSocket.connect(`tcp://code-executor-${this.id}:59488`);
        this.shellSocket.on('message', function() {});

        this.iopubSocket = zmq.socket('sub');
        this.iopubSocket.connect(`tcp://code-executor-${this.id}:59489`);
        this.iopubSocket.subscribe('');
        this.iopubSocket.on('message', function(topic) {
            try {
                self.interpretMessage(topic, arguments);
            } catch(err) {
                logger.emit('code-executor', {event: 'interpret-message-error', err});
            }
        });

        this.stdinSocket = zmq.socket('dealer');
        this.stdinSocket.connect(`tcp://code-executor-${this.id}:59490`);

        this.controlSocket = zmq.socket('dealer');
        this.controlSocket.connect(`tcp://code-executor-${this.id}:59491`);
    }

    interpretMessage(topic, messageList) {
        topic = topic.toString();
        const content = JSON.parse(messageList[messageList.length-1].toString());
        
        logger.emit('code-executor', {event: 'message-from-jupyter', topic, content});

        if( topic.match(/.*status$/)) {
            if( content.execution_state == "idle") {
                this.executionEnd();
            }
        } else if( topic.match(/.*stdout/) || topic.match(/.*stderr/)) {
            this.addToStream(content);
        } else if( topic.match(/.*error/)) {
            if(content.traceback) { 
                content.traceback = fixConsole(content.traceback.join('\n'));
            }
            this.executionError(content);
        } else if( topic.match(/.*execute_result/)) {
            const text = content.data['text/plain'];
            if( text) { this.addToStream({name: 'stdout', text}); }
            else { logger.emit('code-executor', {event: 'unknown-execute-result', content}); }
        } else if( topic == 'display_data') {
            this.addToStream({name: 'object', data: content.data});
        }
    }

    async windUp() {
        try {
            delete executors[this.id];

            let header = {msg_id: uuidv4(), username: 'jupyter', 
                session: uuidv4(), date: new Date().toISOString(), version: '5.0', 
                msg_type: 'shutdown_request'};
            const content = {restart: false};

            this.controlSocket.send([this.id, JUPYTER_DELIM, '', JSON.stringify(header),
                JSON.stringify({}), JSON.stringify({}),
                JSON.stringify(content)]);
            
            await exec('docker', ['kill', `code-executor-${this.id}`]);
        } catch(err) {
            logger.emit('code-executor', {event: 'windup-error', err});
        }
    }

    async execute(code, tests=[]) {
        let {output, hasError} = await new Promise( (resolve, reject) => {
            this.executionBegin(code, resolve, reject);
        });

        const testResults = [];
        for( const test of tests) {
            const ret = await new Promise( (resolve, reject) => {
                this.executionBegin(test, resolve, reject);
            });
            output = output.concat(ret.output);
            testResults.push({content: test, result: ret.hasError ? 'not-ok' : 'ok'});
        }

        return {output, hasError, testResults};
    }

    sendExecuteRequest(code) {
        let header = {msg_id: uuidv4(), username: 'jupyter', 
            session: uuidv4(), date: new Date().toISOString(), version: '5.0', 
            msg_type: 'execute_request'};
        const content = {code: code, silent: false};

        this.shellSocket.send([this.id, JUPYTER_DELIM, '', JSON.stringify(header),
            JSON.stringify({}), JSON.stringify({}),
            JSON.stringify(content)]);
    }
}

StateMachine.factory(CodeExecutor, {
    init: 'ready',
    data: {
        resolve: null,
        reject: null,
        output: null,
        traceback: null,
        executionTimer: null,
        idleTimer: null
    },
    methods: {
        onTransition: function(lifecycle) {
            logger.emit('code-executor', {event: 'transition', id: this.id, name: lifecycle.transition, 
                from: lifecycle.from, to: lifecycle.to});
        },
        onEnterIdling: function() {
            if( this.executionTimer) {
                clearTimeout( this.executionTimer);
            }
            if( this.resolve) {
                const data = {output: this.output, hasError: false};
                if(this.traceback) {
                    data.output.push({name: 'traceback', data: this.traceback});
                    data.hasError = true;
                }
                this.resolve(data);
            }

            this.resolve = this.reject = this.output = this.traceback = this.executionTimer = null;
            this.resetIdleTimeout();
        },
        onLeaveIdling: function() {
            this.clearIdleTimeout();
        },
        resetIdleTimeout: function() {
            this.clearIdleTimeout();
            this.idleTimer = setTimeout(function(self) {
                self.timeout()
            }, IDLE_TIMEOUT, this);
        },
        clearIdleTimeout: function() {
            if(this.idleTimer) {
                clearTimeout(this.idleTimer);
                this.idleTimer = null;
            }
        },
        onEnterShutdown: async function() {
            if( this.resolve) {
                this.resolve({output: this.output, hasError: true});
            }

            await this.windUp();
        }
    },
    transitions: [
        { 
            name: 'execution_begin', from: ['ready', 'idling', 'executing'], 
                to: function(code, resolve, reject) {
                    if(this.state == 'executing') return this.state;

                    this.resolve = resolve;
                    this.reject = reject;
                    this.output = [];

                    this.sendExecuteRequest(code);

                    this.executionTimer = setTimeout(function(self) {
                        self.executionTimeout()
                    }, EXECUTION_TIMEOUT, this);

                    return 'executing';
                } 
        },
        {
            name: 'add_to_stream', from: 'executing', to: function(data) {
                this.output.push(data);

                return 'executing';
            }
        },
        {
            name: 'execution_error', from: 'executing', to: function(data) {
                this.traceback = data;
                return this.state;
            }
        },
        {
            name: 'execution_end', from: 'executing', to: 'idling'
        },
        {
            name: 'execution_timeout', from: 'executing', to: 'shutdown'
        },
        {
            name: 'timeout', from: '*', to: 'shutdown'
        },
        {
            name: 'heartbeat', from: '*', to: function() { 
                if(this.idleTimer) {
                    this.resetIdleTimeout();
                }
                return this.state;
            }
        }
    ]
});