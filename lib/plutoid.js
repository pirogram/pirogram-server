'use strict';

const uuid = require('uuid/v4');
const { exec } = require('./subprocess');
const {logger} = require('./logger');
const axios = require('axios');
const config = require('config');
const crypto = require('crypto');

async function createSession(author, moduleCode) {
    const sessionId = crypto.randomBytes(10).toString('hex');

    const cmd = 'docker';
    const args = ['run', '--rm', '-d', '-t', '--log-driver', 'fluentd',
        '--mount', `type=volume,source=pirogram-content,destination=/home/plutoid,readonly`,
        '-w', `/home/plutoid/live/${author}/${moduleCode}`,
        '--network', 'pirogram', '--name', `plutoid_${sessionId}`,
        '--log-opt', `tag=docker.plutoid-${sessionId}`, 'pirogram/plutoid', 'plutoidweb'];
    await exec( cmd, args);

    logger.emit('plutoid', {type: 'new-session', sessionId});

    return new Promise( (resolve, reject) => {
        setTimeout( () => { resolve( sessionId); }, 2000);
    });
}


export async function executeCodeRequest( playgroundId, sessionId, executionId, code, tests=[], allowInput=true) {
    if( !sessionId) {
        const [author, moduleCode, ...rest] = playgroundId.split('::');
        sessionId = await createSession(author, moduleCode);
    }

    return new Promise( (resolve, reject) => {
        const serverPort = config.get('server.port');
        const inputWebhook = allowInput ?  `http://pi_serv:${serverPort}/code-requests/${executionId}/input-request` : null;
        const data = { code, tests, input_webhook: inputWebhook };
        const url = `http://plutoid_${sessionId}:6699/code-requests/${executionId}`;

        logger.emit( 'plutoid', {type: 'code-request-init', sessionId, executionId, code, tests});

        axios( { method: 'post',
            url,
            data,
            timeout: 300000
        })
        .then( (response) => {
            const output = response.data.output;
            const hasError = response.data.has_error;
            const testResults = response.data.test_results;

            logger.emit('plutoid', {type: 'code-request-complete', sessionId, executionId, 
                code, tests, output, testResults, hasError});

            resolve( {sessionId, output, hasError, testResults, inputRequired: false});
        })
        .catch((err) => {
            logger.emit('plutoid', {type: 'code-request-error', sessionId, executionId, 
                code, tests, err: err.toString()});

            reject( err);
        });
    });
}

export async function sendKeepAlive( sessionId) {
    return new Promise( (resolve, reject) => {
        logger.emit('plutoid', {type: 'keep-alive', sessionId});

        axios( { method: 'get',
            url: `http://plutoid_${sessionId}:6699/keepalive`,
            timeout: 1000
        })
        .then( (response) => {
            resolve( true);
        })
        .catch((err) => {
            logger.emit('plutoid', {type: 'keep-alive-error', sessionId});
            resolve( false);
        });
    });
}