'use strict';

const Koa = require( 'koa');
const view = require( './lib/view');
const serve = require( 'koa-static');
const mount = require( 'koa-mount');
const session = require( './lib/session');
const auth = require( './controllers/auth');
const flash = require( './lib/flash');
const authlib = require( './lib/auth');
const misc = require( './controllers/misc');
const packages = require( './controllers/packages');
const user = require( './controllers/user');
const code = require( './controllers/code');
const bodyParser = require( 'koa-body');
const reqLogger = require('koa-logger');
const config = require('config');

const {CodeExecutor} = require('./lib/code-executor');
CodeExecutor.buildPool();

const app = new Koa();

app.use( bodyParser({multipart: true}));
app.use( reqLogger());
app.use( session( app));
app.use( authlib.setSessionUser);
app.use( view( __dirname + '/views', {
    globals: {
        'getFlashMessages': flash.getFlashMessages
    }
}));

app.use( mount( auth.authApp));
app.use( mount( user.userApp));
app.use( mount( packages.packagesApp));
app.use( mount( misc.miscApp));
app.use( mount( code.codeApp));
app.use( mount( '/static', serve( __dirname + '/static')));

app.listen( config.get('server.port'));