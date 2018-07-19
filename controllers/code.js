'use strict';

const Koa = require('koa');
const router = require( 'koa-route');
const models = require('../models');
const plutoid = require('../lib/plutoid');
const {CodeExecutor} = require('../lib/code-executor');

const codeApp = new Koa();


codeApp.use( router.post( '/code-requests', async function( ctx) {
    if(!ctx.state.user) { ctx.redirect('/login'); return; }

    const inSessionId = ctx.request.body.sessionId;
    const code = ctx.request.body.code;
    const executionId = ctx.request.body.executionId;
    const playgroundId = ctx.request.body.playgroundId;

    await models.savePlaygroundCode( ctx.state.user.id, playgroundId, code);

    //const {sessionId, output, inputRequired, testResults} = await plutoid.executeCodeRequest( playgroundId, inSessionId, executionId, code);
    var codeExecutor = null;
    if( inSessionId) { codeExecutor = CodeExecutor.getById(inSessionId); }
    else { codeExecutor = CodeExecutor.get(); }
    
    const {output, hasError} = await codeExecutor.execute(code);

    ctx.body = JSON.stringify({output, hasError, inputRequired: false, sessionId: codeExecutor.id});
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