'use strict';

const uuid = require('uuid/v4');
const { spawn } = require('child_process');
const {logger} = require('./logger');
const axios = require('axios');
const config = require('config');

const sessionPorts = {};

async function createSession() {
    const port = Math.floor(Math.random() * (9000 - 6000 + 1)) + 6000;
    const sessionId = uuid();

    sessionPorts[ sessionId] = port;

    const cmd = 'docker';
    const args = ['run', '-p', `${port}:6699/tcp`, '-d', '-t', '--log-driver=fluentd', '--log-opt', 
        `tag=docker.plutoid-${port}`, 'manasgarg/plutoid', 'plutoidweb'];
    const proc = spawn( cmd, args);

    logger.emit('plutoid', {type: 'new-session', sessionId, port});

    return new Promise( (resolve, reject) => {
        setTimeout( () => { resolve( sessionId); }, 2000);
    });
}


export async function executeCodeRequest( sessionId, executionId, code, tests=[], allowInput=true) {
    if( !sessionId) {
        sessionId = await createSession();
    }

    return new Promise( (resolve, reject) => {
        const port = sessionPorts[ sessionId];
        const serverPort = config.get('server.port');
        const inputWebhook = allowInput ?  `http://localhost:${serverPort}/code-requests/${executionId}/input-request` : null;
        const data = { code, tests, input_webhook: inputWebhook };
        const url = `http://localhost:${port}/code-requests/${executionId}`;

        logger.emit( 'plutoid', {type: 'code-request-init', sessionId, port, executionId, code, tests});

        axios( { method: 'post',
            url,
            data,
            timeout: 300000
        })
        .then( (response) => {
            const output = response.data.output;
            const hasError = response.data.has_error;
            const testResults = response.data.test_results;

            logger.emit('plutoid', {type: 'code-request-complete', sessionId, port, executionId, 
                code, tests, output, testResults, hasError});

            resolve( {sessionId, output, hasError, testResults, inputRequired: false});
        })
        .catch((err) => {
            logger.emit('plutoid', {type: 'code-request-error', sessionId, port, executionId, 
                code, tests, err: err.toString()});

            reject( err);
        });
    });
}

export async function sendKeepAlive( sessionId) {
    return new Promise( (resolve, reject) => {
        const port = sessionPorts[ sessionId];
        if( !port) { 
            resolve(false);
            return;
        }

        logger.emit('plutoid', {type: 'keep-alive', sessionId, port});

        axios( { method: 'get',
            url: `http://localhost:${port}/keepalive`,
            timeout: 1000
        })
        .then( (response) => {
            resolve( true);
        })
        .catch((err) => {
            logger.emit('plutoid', {type: 'keep-alive-error', sessionId, port});
            delete sessionPorts[sessionId];
            resolve( false);
        });
    });
}