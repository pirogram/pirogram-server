'use strict';

const google = require('googleapis');
const Koa = require('koa');
const router = require( 'koa-route');
const models = require( '../models');
const flash = require( '../lib/flash');
const config = require('config');

const oauthApp = new Koa();
const OAuth2 = google.auth.OAuth2;

const scopes = ['https://www.googleapis.com/auth/plus.me',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile'];

oauthApp.use(router.get( '/login', (ctx) => {
    const oauth2Client = new OAuth2(
        "1043782400261-4vnh8d1lt76n42djlenkq9r1hj75edui.apps.googleusercontent.com",
        "owRPFCyM-OXG-JB2u8_ESpLq",
        config.get('google_oauth.redirect_uri')
    );

    const url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
    });

    ctx.redirect( url);
}));

function getGoogleTokens (oauth2Client, code) {
    return new Promise( (resolve, reject) => {
        oauth2Client.getToken(code, function (err, tokens) {
            // Now tokens contains an access_token and an optional refresh_token. Save them.
            if (!err) {
                oauth2Client.setCredentials(tokens);
                resolve();
            }
            else {
                reject(err);
            }
        });
    });
}

function getGoogleProfile(oauth2Client) {
    return new Promise( (resolve, reject) => {
        google.plus('v1').people.get({userId: 'me', auth: oauth2Client}, function(err, response) {
            if(err) {
                reject(err);
            }
            else {
                resolve(response);
            }
        });
    })
}

oauthApp.use( router.get( '/google-oauth-callback', async function(ctx) {
    const oauth2Client = new OAuth2(
        "1043782400261-4vnh8d1lt76n42djlenkq9r1hj75edui.apps.googleusercontent.com",
        "owRPFCyM-OXG-JB2u8_ESpLq",
        config.get('google_oauth.redirect_uri')
    );

    const code = ctx.query.code;

    if( ctx.query.error) {
        flash.addFlashMessage( ctx.session, 'error', 'There was an error in signing you in. Please try again.');
        ctx.redirect( '/');
        return;
    }

    let profile = null;

    try {
        await getGoogleTokens(oauth2Client, code);
        profile = await getGoogleProfile(oauth2Client);
    } catch( err) {
        flash.addFlashMessage( ctx.session, 'error', 'There was an error in signing you in. Please try again.');
        ctx.redirect( '/');
        return;
    }

    const email = profile.emails[0].value;

    let user = await models.getUserByEmail( email);
    if( !user) {
        user = await models.createUser( profile.displayName, email, profile.image.url);
    }

    ctx.session.userId = user.id;

    ctx.redirect( '/');
}));

oauthApp.use( router.get( '/logout', async function( ctx) {
    ctx.session.userId = null;
    flash.addFlashMessage( ctx.session, 'success', 'You have been logged out.');

    ctx.redirect( '/');
}));


module.exports = { oauthApp};