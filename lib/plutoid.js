'use strict';

const uuid = require('uuid/v4');
const { spawn } = require('child_process');
const axios = require('axios');
const config = require('config');

const sessionPorts = {};

async function createSession() {
    const port = Math.floor(Math.random() * (9000 - 6000 + 1)) + 6000;
    const sessionId = uuid();

    sessionPorts[ sessionId] = port;

    const cmd = 'plutoidweb';
    const args = ['--port', port];
    const proc = spawn( cmd, args);

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

        axios( { method: 'post',
            url: `http://localhost:${port}/code-requests/${executionId}`,
            data,
            timeout: 300000
        })
        .then( (response) => {
            resolve( {sessionId, output: response.data.output, hasError: response.data.has_error,
                testResults: response.data.test_results, inputRequired: false});
        })
        .catch((err) => {
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

        axios( { method: 'get',
            url: `http://localhost:${port}/keepalive`,
            timeout: 1000
        })
        .then( (response) => {
            resolve( true);
        })
        .catch((err) => {
            delete sessionPorts[sessionId];
            resolve( false);
        });
    });
}