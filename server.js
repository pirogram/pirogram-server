'use strict';

const Koa = require( 'koa');
const view = require( './lib/view');
const serve = require( 'koa-static');
const mount = require( 'koa-mount');
const session = require( './lib/session');
const oauth = require( './controllers/oauth');
const flash = require( './lib/flash');
const topic = require( './controllers/topic');
const misc = require( './controllers/misc');
const bodyParser = require( 'koa-body');
const reqLogger = require('koa-logger');

const app = new Koa();

app.use( bodyParser({multipart: true}));
app.use( reqLogger());
app.use( session( app));
app.use( oauth.setSessionUser);
app.use( view( __dirname + '/views', {
    globals: {
        'getFlashMessages': flash.getFlashMessages
    }
}));

app.use( mount( oauth.oauthApp));
app.use( mount( topic.topicApp));
app.use( mount( misc.miscApp));
app.use( mount( '/static', serve( __dirname + '/static')));

app.listen( 5000);