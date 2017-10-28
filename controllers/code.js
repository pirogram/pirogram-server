'use strict';

const Koa = require('koa');
const router = require( 'koa-route');
const models = require('../models');
const plutoid = require('../lib/plutoid');

const codeApp = new Koa();


codeApp.use( router.post( '/code-requests', async function( ctx) {
    if(!ctx.state.user) { ctx.redirect('/login'); return; }

    const inSessionId = ctx.request.body.sessionId;
    const code = ctx.request.body.code;
    const executionId = ctx.request.body.executionId;
    const playgroundId = ctx.request.body.playgroundId;

    if( playgroundId) {
        await models.savePlaygroundCode( ctx.state.user.id, playgroundId, code);
    }

    const {sessionId, output, inputRequired, testResults} = await plutoid.executeCodeRequest( inSessionId, executionId, code);

    ctx.body = JSON.stringify({output, inputRequired, sessionId});
}));


codeApp.use( router.get( '/code-keepalive', async function( ctx) {
    if(!ctx.state.user) { ctx.redirect('/login'); return; }

    const sessionId = ctx.query.sessionId;
    if( !sessionId) { ctx.status = 400; return; }

    const isAlive = await plutoid.sendKeepAlive( sessionId);

    ctx.body = JSON.stringify({isAlive});
}));


module.exports = { codeApp};