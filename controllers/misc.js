'use strict';

const Koa = require('koa');
const router = require( 'koa-route');
const models = require( '../models');
const subprocess = require( '../lib/subprocess');

const miscApp = new Koa();

const index = async function( ctx) {
    await ctx.render( 'index')
};

const regexMatch = async function( ctx) {
    const {stdout, stderr} = await subprocess.exec( 'python3',
        ['py-scripts/regexutils.py'], {}, JSON.stringify( ctx.request.body));

    ctx.body = stdout;
};

miscApp.use( router.get( '/', index));
miscApp.use( router.post( '/regex-match', regexMatch));

module.exports = { miscApp};