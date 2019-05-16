'use strict';

const Koa = require( 'koa');
const router = require( 'koa-route');
const cms = require('../lib/cms');
const config = require( 'config');
const _ = require( 'lodash');
const { exec } = require('../lib/subprocess');

const miscApp = new Koa();

const index = async function( ctx) {
    await ctx.render('home');
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

const refresh_books = async function( ctx) {
    await exec('/usr/local/bin/refresh-books.sh');
    ctx.status = 200;
}


miscApp.use( router.get( '/', index));
miscApp.use( router.get( '/privacy', privacy));
miscApp.use( router.get( '/about', about));
miscApp.use( router.get( '/terms-of-service', terms_of_service));
miscApp.use( router.post('/refresh-books', refresh_books));
miscApp.use( router.get('/refresh-books', refresh_books));

miscApp.use( router.get( '/sitemap.xml', async function(ctx) {
    ctx.type = 'application/xml';
    
    const urlBase = config.get('site.url_base');
    const books = cms.allBooks();
    
    const body = [];
    body.push( `<?xml version="1.0" encoding="UTF-8"?>`);
    body.push( `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`);

    for( const book of books) {
        for( const group of book.topicGroups) {
            for( const topic of group.topics) {
                body.push( `<url><loc>${urlBase}/@${book.code}/${topic.code}</loc></url>`);
            }
        }
    }

    body.push( `<url><loc>${urlBase}</loc></url>`);
    body.push( `<url><loc>${urlBase}/login</loc></url>`);
    body.push( `<url><loc>${urlBase}/privacy</loc></url>`);
    body.push( `<url><loc>${urlBase}/terms-of-service</loc></url>`);
    body.push( `<url><loc>${urlBase}/about</loc></url>`);
    body.push( `</urlset>`);

    ctx.body = body.join('\n');
}))

module.exports = { miscApp};