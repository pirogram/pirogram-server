'use strict';

const Koa = require('koa');
const router = require( 'koa-route');
const uuid = require('uuid/v4');
const { spawn } = require('child_process');
const winston = require('winston');
const axios = require('axios');
const config = require('config');
const models = require('../models');

const codeApp = new Koa();
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


function executeCodeRequest( sessionId, executionId, code) {
    return new Promise( (resolve, reject) => {
        const port = sessionPorts[ sessionId];
        const serverPort = config.get('server.port');
        axios( { method: 'post',
            url: `http://localhost:${port}/code-requests/${executionId}`,
            data: {
                code: code,
                input_webhook: `http://localhost:${serverPort}/code-requests/${executionId}/input-request`
            },
            timeout: 300000
        })
        .then( (response) => {
            resolve( {sideEffects: response.data.side_effects, inputRequired: false});
        })
        .catch((err) => {
            reject( err);
        });
    });
}


codeApp.use( router.post( '/code-requests/:executionId', async function( ctx, executionId) {
    if(!ctx.state.user) { ctx.redirect('/login'); return; }

    let sessionId = ctx.request.body.sessionId;
    const code = ctx.request.body.code;
    const playgroundId = ctx.request.body.playgroundId;

    if( playgroundId) {
        await models.savePlaygroundCode( ctx.state.user.id, playgroundId, code);
    }

    if( !sessionId) {
        sessionId = await createSession();
    }

    const {sideEffects, inputRequired} = await executeCodeRequest( sessionId, executionId, code);

    ctx.body = JSON.stringify({sideEffects, inputRequired, sessionId});
}));


async function sendKeepAlive( sessionId) {
    const port = sessionPorts[ sessionId];

    return new Promise( (resolve, reject) => {
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

codeApp.use( router.get( '/code-keepalive', async function( ctx) {
    if(!ctx.state.user) { ctx.redirect('/login'); return; }

    const sessionId = ctx.query.sessionId;
    if( !sessionId) { ctx.status = 400; return; }

    const port = sessionPorts[ sessionId];
    if( !port) { 
        ctx.body = JSON.stringify({isAlive: false});
        return;
    }

    const isAlive = await sendKeepAlive( sessionId);

    ctx.body = JSON.stringify({isAlive});
}));


module.exports = { codeApp};