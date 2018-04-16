'use strict';

const Koa = require('koa');
const router = require( 'koa-route');
const models = require( '../models');
const validator = require('validator');
const uuidv4 = require('uuid/v4');
const _ = require('lodash');
const config = require('config');
const flash = require( '../lib/flash');
const email = require( '../lib/email');
const bcrypt = require( 'bcrypt');
import {ensureUser} from '../lib/util';

const SALT_ROUNDS = 5;

const userApp = new Koa();

userApp.use( router.get( '/account/update', async function( ctx) {
    if( !ensureUser( ctx)) { return; }

    const user = await models.getUserById( ctx.state.user.id);
    const username = user.attributes.name;
    const blurb = user.attributes.blurb || '';
    const password = user.attributes.password;
    await ctx.render( 'edit-profile', {username, blurb, password});    
}));

userApp.use( router.post( '/account/update', async function( ctx) {
    if( !ensureUser( ctx)) { return; }

    const user = await models.getUserById( ctx.state.user.id);

    const errors = {};
    const username = ctx.request.body.username;
    const blurb = ctx.request.body.blurb;

    if( !validator.isLength( username, {min: 5, max: 24}) ||
        !validator.matches( username, /^([a-zA-Z0-9-]+)$/)) {
        errors['username'] = 'Username must be 5 to 24 characters. Alphanumeric and - allowed.';
    }

    if( username.toLowerCase() != user.attributes.username && !await models.isUsernameAvaialble( username)) {
        errors['username'] = 'Sorry, this username is already taken.';
    }

    if( !validator.isLength( blurb, {min: 0, max: 256})) {
        errors['blurb'] = 'Blurb must not be more than 256 characters.';
    }
    
    const updates = {username: username.toLowerCase(), name: username, blurb: blurb};
    if( _.keys(errors).length > 0) {
        await ctx.render('edit-profile', {errors, username, blurb});
        return;
    }

    await models.User.where({id: ctx.state.user.id}).save(updates, {patch: true, method: 'update'});

    flash.addFlashMessage( ctx.session, 'info', 'Successfully saved your details.');
    ctx.redirect('/account/update');
}));

userApp.use( router.get( '/account/delete', async function( ctx) {
    if( !ensureUser( ctx)) { return; }

    await ctx.render( 'delete-profile', {});    
}));


userApp.use( router.post( '/account/delete', async function( ctx) {
    if( !ensureUser( ctx)) { return; }

    const user = await models.getUserById( ctx.state.user.id);
    const errors = {};
    const username = ctx.request.body.username;

    if( username.toLowerCase() != user.attributes.username) {
        errors['username'] = 'Sorry, you entered incorrect username.';
    }

    if( _.keys(errors).length > 0) {
        await ctx.render('delete-profile', {username, errors});
        return;
    }

    const updates = {
        is_deleted: true, 
        username: `user.${user.attributes.id}`, 
        name: `user.${user.attributes.id}`, 
        email: `user.${user.attributes.id}@does-not-exist.com`, 
        avatar: ''
    };
    await models.User.where({id: ctx.state.user.id}).save(updates, {patch: true, method: 'update'});

    flash.addFlashMessage( ctx.session, 'info', 'Successfully deleted your account.');
    ctx.redirect('/');
}));

userApp.use( router.get( '/account/reset-password-link-request', async function( ctx) {
    await ctx.render('reset-password-link-request');
}));

userApp.use( router.post( '/account/reset-password-link-request', async function( ctx) {
    let user = ctx.state.user;
    if( !user) {
        const usernameOrEmail = ctx.request.body.usernameOrEmail;
        user = await models.getUserByUsername( usernameOrEmail);
        if( !user) { user = await models.getUserByEmail( usernameOrEmail); }
        if( !user) {
            flash.addFlashMessage( ctx.session, 'error', 'Incorrect email or username. Please try again.');
            ctx.redirect('/account/reset-password-link-request');
            return;
        }
        user = user.attributes;
    }

    const uuid = uuidv4();
    await models.createPasswordResetRequest( uuid, user.id);

    const siteName = config.get('site.name');
    const urlBase = config.get('site.url_base');
    const text = `Hi,

Please click on the following link to reset your password for ${siteName}. If you did not request for password reset, please ignore this email.

${urlBase}/account/reset-password/${uuid}

Thanks
`;

    await email.sendEmail(config.get('email.system_from'), user.email, 'Password Reset Instructions', text);

    flash.addFlashMessage( ctx.session, 'info', 'Sent you an email with instructions about resetting your password. If you do not see the email, please check your Spam folder.');

    ctx.redirect('/account/reset-password-link-request');
}));

userApp.use( router.get('/account/reset-password/:id', async function( ctx, id) {
    const passwordResetRequest = await models.getPasswordResetRequest(id);

    if( !passwordResetRequest) {
        flash.addFlashMessage( ctx.session, 'error', 'Invalid password reset link. If you wish to reset your password, please generate a password reset link now.');
        ctx.redirect('/account/reset-password-link-request');
        return;
    }

    console.log( passwordResetRequest.attributes.created_at );
    console.log( new Date());

    await ctx.render( 'reset-password');
}));


userApp.use( router.post( '/account/reset-password/:id', async function( ctx, id) {
    const passwordResetRequest = await models.getPasswordResetRequest(id);

    if( !passwordResetRequest) {
        flash.addFlashMessage( ctx.session, 'error', 'Invalid password reset link. If you wish to reset your password, please generate a password reset link now.');
        ctx.redirect('/account/reset-password-link-request');
        return;
    }

    const password1 = ctx.request.body.newPassword1;
    const password2 = ctx.request.body.newPassword2;

    let errorMessage = null;
    if( password1 != password2) {
        errorMessage = "Both passwords do not match.";
    } else if( password1.length < 8) {
        errorMessage = "Password must be at least 8 characters long.";
    }

    if( errorMessage) {
        flash.addFlashMessage( ctx.session, 'error', errorMessage);
        await ctx.render( 'reset-password');
        return;
    }

    const userId = passwordResetRequest.attributes.user_id;
    const hashedPassword = await bcrypt.hash( password1, SALT_ROUNDS);
    await models.User.forge({id: userId}).save({password: hashedPassword}, {method: 'update', patch: true});

    flash.addFlashMessage(ctx.session, 'info', 'Successfully updated the password.');

    if( ctx.state.user && ctx.state.user.id) {
        ctx.redirect('/account/update');
    } else {
        ctx.redirect('/login');
    }
}));

userApp.use( router.post('/account/password', async function(ctx){
    if( !ensureUser(ctx)) { return; }

    const password = ctx.request.body.current;
    const password1 = ctx.request.body.newPassword1;
    const password2 = ctx.request.body.newPassword2; 

    let errorMessage = null;
    if( password1 != password2) {
        errorMessage = "Both passwords do not match.";
    } else if( password1.length < 8) {
        errorMessage = "Password must be at least 8 characters long.";
    } else if( !await bcrypt.compare( password, ctx.state.user.password)) {
        errorMessage = "Current password is incorrect.";
    }

    if( errorMessage) {
        flash.addFlashMessage( ctx.session, 'error', errorMessage);
        ctx.redirect('/account/update');
        return;
    }

    const hashedPassword = await bcrypt.hash( password1, SALT_ROUNDS);
    await models.User.forge({id: ctx.state.user.id}).save({password: hashedPassword}, {method: 'update', patch: true});

    flash.addFlashMessage(ctx.session, 'info', 'Successfully updated the password.');

    ctx.redirect('/account/update');
}));

userApp.use( router.get('/login', async function( ctx){
    if( ctx.state.user && ctx.state.user.id) {
        ctx.redirect('/');
        return;
    }

    await ctx.render('login');
}));

userApp.use( router.post('/login', async function( ctx) {
    if( ctx.state.user && ctx.state.user.id) {
        ctx.redirect('/');
        return;
    }

    const usernameOrEmail = ctx.request.body.usernameOrEmail;
    const password = ctx.request.body.password;

    let user = await models.getUserByUsername( usernameOrEmail);
    if( !user) { user = await models.getUserByEmail( usernameOrEmail); }
    if( !user) {
        flash.addFlashMessage( ctx.session, 'error', 'Incorrect email or username. Please try again.');
        ctx.redirect('/account/reset-password-link-request');
        return;
    }

    if( await bcrypt.compare( password, user.attributes.password)) {
        ctx.session.userId = user.attributes.id;
        ctx.redirect('/');
    } else {
        flash.addFlashMessage( ctx.session, 'error', 'Incorrect username/email and password. Please try again.');
        await ctx.render('login');
    }
}))

module.exports = { userApp};