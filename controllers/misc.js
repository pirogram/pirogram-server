'use strict';

const Koa = require( 'koa');
const router = require( 'koa-route');
const models = require( '../models');
const subprocess = require( '../lib/subprocess');
const cms = require('../lib/cms');
const config = require( 'config');
const _ = require( 'lodash');

const miscApp = new Koa();

const index = async function( ctx) {
    if( ctx.state.user) {
        ctx.redirect('/packages');
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

miscApp.use( router.get( '/sitemap.xml', async function(ctx) {
    ctx.type = 'application/xml';
    
    const urlBase = config.get('site.url_base');
    const packageSummaryDict = cms.getAllLivePackageSummary();
    
    const body = [];
    body.push( `<?xml version="1.0" encoding="UTF-8"?>`);
    body.push( `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`);

    _.values( packageSummaryDict).map( (p, i) => {
        p.topics.map( (topic, j) => {
            body.push( `<url><loc>${urlBase}/@${p.meta.author}/${p.meta.code}/${topic.meta.code}</loc></url>`);
        })
    });

    body.push( `<url><loc>${urlBase}</loc></url>`);
    body.push( `<url><loc>${urlBase}/login</loc></url>`);
    body.push( `<url><loc>${urlBase}/privacy</loc></url>`);
    body.push( `<url><loc>${urlBase}/terms-of-service</loc></url>`);
    body.push( `<url><loc>${urlBase}/about</loc></url>`);
    body.push( `</urlset>`);

    ctx.body = body.join('\n');
}))

module.exports = { miscApp};