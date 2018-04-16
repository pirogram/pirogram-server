'use strict';

const google = require('googleapis');
const Koa = require('koa');
const router = require( 'koa-route');
const models = require( '../models');
const flash = require( '../lib/flash');
const config = require('config');
const axios = require('axios');
const _ = require('lodash');
const slugify = require('slugify');

const authApp = new Koa();

authApp.use(router.get( '/login-with-google', (ctx) => {
    const oauth2Client = new google.auth.OAuth2(
        config.get('google_oauth.client_id'),
        config.get('google_oauth.client_secret'),
        config.get('google_oauth.redirect_uri')
    );

    const url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: config.get('google_oauth.scopes'),
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

authApp.use( router.get( '/google-oauth-callback', async function(ctx) {
    const oauth2Client = new google.auth.OAuth2(
        config.get('google_oauth.client_id'),
        config.get('google_oauth.client_secret'),
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
        user = await createUser( ctx, profile.displayName, email, profile.image.url);
    }

    ctx.session.userId = user.id;

    ctx.redirect( '/');
}));

async function createUser( ctx, name, email, avatar) {
    let username = slugify(name.toLowerCase(), '');
    if( await models.getUserByUsername(username)) {
        username = slugify(email.split('@')[0]);
        if( await models.getUserByUsername( username)) {
            username = slugify(name.toLowerCase(), '') + (Math.floor(Math.random() * Math.floor(10000)));
        }
    }

    flash.addFlashMessage( ctx.session, 'info', `Generated username ${username} for you. You can always change it from your profile settings.`);

    return await models.createUser( username, email, avatar);
}

async function getGithubToken( data) {
    return new Promise( (resolve, reject) => {
        const url = `https://github.com/login/oauth/access_token`;

        axios( { method: 'post',
            url,
            data,
            headers: {'Accept': 'application/json'}
        })
        .then( (response) => {
            resolve( response.data.access_token);
        })
        .catch((err) => {
            reject( err);
        });
    });
}

async function getGithubProfile( token) {
    return new Promise( (resolve, reject) => {
        const url = `https://api.github.com/user`;

        axios({ 
            url,
            headers: {'Authorization': `token ${token}`}
        })
        .then( (response) => {
            resolve( response.data);
        })
        .catch((err) => {
            reject( err);
        });
    });
}

async function getGithubEmail( token) {
    return new Promise( (resolve, reject) => {
        const url = `https://api.github.com/user/emails`;

        axios({ 
            url,
            headers: {'Authorization': `token ${token}`}
        })
        .then( (response) => {
            const primary = _.find(response.data, {primary: true});
            if( !primary) {
                reject( 'Primary email address not found.');
            } else {
                resolve( primary.email);
            }
        })
        .catch((err) => {
            reject( err);
        });
    });
}


authApp.use( router.get( '/login-with-github', async function( ctx) {
    const data = {
        client_id: config.get('github_oauth.client_id'),
        redirect_uri: config.get('github_oauth.redirect_uri'),
        scope: config.get('github_oauth.scopes').join(','),
        state: Math.random().toString()
    };
    const url = `https://github.com/login/oauth/authorize?client_id=${data.client_id}&redirect_uri=${data.redirect_uri}&scope=${data.scope}&state=${data.state}`;

    ctx.session.github_oauth_state = data.state;
    ctx.redirect( url);
}));

authApp.use( router.get( '/github-oauth-callback', async function( ctx) {
    const data = {
        client_id: config.get('github_oauth.client_id'),
        client_secret: config.get('github_oauth.client_secret'),
        redirect_uri: config.get('github_oauth.redirect_uri'),
        state: ctx.session.github_oauth_state,
        code: ctx.query.code
    };

    let profile = null;
    try {
        const token = await getGithubToken( data);
        profile = await getGithubProfile( token);
        if( !profile.email) {
            profile.email = await getGithubEmail( token);
        }
    } catch( err) {
        flash.addFlashMessage( ctx.session, 'error', 'There was an error in signing you in. Please try again.');
        ctx.redirect( '/');
        return;
    }

    const email = profile.email;

    let user = await models.getUserByEmail( email);
    if( !user) {
        user = await createUser( ctx, profile.name, email, profile.avatar_url);
    }

    ctx.session.userId = user.id;

    ctx.redirect( '/');
}));

authApp.use( router.get( '/logout', async function( ctx) {
    ctx.session.userId = null;
    flash.addFlashMessage( ctx.session, 'success', 'You have been logged out.');

    ctx.redirect( '/');
}));

authApp.use( router.get( '/login', async function( ctx) {
    ctx.redirect( '/');
}));

module.exports = { authApp};