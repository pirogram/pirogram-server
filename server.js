'use strict';

const Koa = require( 'koa');
const view = require( './lib/view');
const serve = require( 'koa-static');
const mount = require( 'koa-mount');
const session = require( './lib/session');
const oauth = require( './controllers/oauth');
const flash = require( './lib/flash');
const auth = require( './lib/auth');
const topic = require( './controllers/topic');
const misc = require( './controllers/misc');
const modules = require( './controllers/modules');
const code = require( './controllers/code');
const bodyParser = require( 'koa-body');
const reqLogger = require('koa-logger');
const config = require('config');

const app = new Koa();

app.use( bodyParser({multipart: true}));
app.use( reqLogger());
app.use( session( app));
app.use( auth.setSessionUser);
app.use( view( __dirname + '/views', {
    globals: {
        'getFlashMessages': flash.getFlashMessages
    }
}));

app.use( mount( oauth.oauthApp));
app.use( mount( topic.topicApp));
app.use( mount( modules.modulesApp));
app.use( mount( misc.miscApp));
app.use( mount( code.codeApp));
app.use( mount( '/static', serve( __dirname + '/static')));

app.listen( config.get('server.port'));