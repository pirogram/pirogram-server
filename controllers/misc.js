'use strict';

const Koa = require('koa');
const router = require( 'koa-route');
const models = require( '../models');
const subprocess = require( '../lib/subprocess');

const miscApp = new Koa();

const index = async function( ctx) {
    if( ctx.state.user) {
        ctx.redirect('/study-queue');
        return;
    } else {
        await ctx.render( 'index')
    }
};

const privacy = async function( ctx) {
    await ctx.render( 'privacy')
};

const about = async function( ctx) {
    await ctx.render( 'about')
};

const terms_of_service = async function( ctx) {
    await ctx.render( 'terms-of-service')
};

const regexMatch = async function( ctx) {
    const {stdout, stderr} = await subprocess.exec( 'python3',
        ['py-scripts/regexutils.py'], {}, JSON.stringify( ctx.request.body));

    ctx.body = stdout;
};

miscApp.use( router.get( '/', index));
miscApp.use( router.post( '/regex-match', regexMatch));
miscApp.use( router.get( '/privacy', privacy));
miscApp.use( router.get( '/about', about));
miscApp.use( router.get( '/terms-of-service', terms_of_service));
miscApp.use( router.get( '/structmd', async function(ctx) {
    await ctx.render( 'structmd');
}));

module.exports = { miscApp};