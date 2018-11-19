'use strict';

const Koa = require('koa');
const router = require( 'koa-route');
const models = require('../models');
const {CodeExecutor} = require('../lib/code-executor');
const cms = require('../lib/cms');

const codeApp = new Koa();


codeApp.use( router.post( '/code-requests', async function( ctx) {
    if(!ctx.state.user) { ctx.redirect('/login'); return; }

    const inSessionId = ctx.request.body.sessionId;
    const code = ctx.request.body.code;
    const playgroundId = ctx.request.body.playgroundId;
    const viewOnly = ctx.request.body.viewOnly;

    if( playgroundId && !viewOnly) {
        await models.savePlaygroundCode( ctx.state.user.id, playgroundId, code);
    }

    var codeExecutor = null;
    if( inSessionId) { 
        codeExecutor = CodeExecutor.getById(inSessionId); 
    } else { 
        codeExecutor = await CodeExecutor.get();
    }
    
    const {output, hasError, needInput} = await codeExecutor.execute(code);

    ctx.body = JSON.stringify({output, hasError, needInput, sessionId: codeExecutor.id});
}));


codeApp.use( router.post( '/code-input', async function( ctx) {
    if(!ctx.state.user) { ctx.redirect('/login'); return; }

    const inSessionId = ctx.request.body.sessionId;
    const inputValue = ctx.request.body.inputValue;

    const codeExecutor = CodeExecutor.getById(inSessionId);
    if( !codeExecutor) {
        ctx.status = 404;
        return;
    }

    const {output, hasError, needInput} = await codeExecutor.provideInput(inputValue);

    ctx.body = JSON.stringify({output, hasError, needInput, sessionId: codeExecutor.id});
}));


codeApp.use( router.get( '/code-keepalive', async function( ctx) {
    if(!ctx.state.user) { ctx.redirect('/login'); return; }

    const sessionId = ctx.query.sessionId;
    if( !sessionId) { ctx.status = 400; return; }

    const codeExecutor = CodeExecutor.getById(sessionId);
    if( codeExecutor) { codeExecutor.heartbeat(); }

    ctx.body = JSON.stringify({isAlive: codeExecutor != null});
}));


module.exports = { codeApp};