'use strict';

const Koa = require('koa');
const router = require( 'koa-route');
const models = require( '../models');
const validator = require('validator');
const _ = require('lodash');
const flash = require( '../lib/flash');
import {ensureUser} from '../lib/util';

const userApp = new Koa();

userApp.use( router.get( '/account/update', async function( ctx) {
    if( !ensureUser( ctx)) { return; }

    const user = await models.getUserById( ctx.state.user.id);
    const username = user.attributes.name;
    const blurb = user.attributes.blurb || '';
    await ctx.render( 'edit-profile', {username, blurb});    
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
        username: `deleted.${user.attributes.id}`, 
        name: `deleted.${user.attributes.id}`, 
        email: `deleted.${user.attributes.id}@pirogram.com`, 
        avatar: ''
    };
    await models.User.where({id: ctx.state.user.id}).save(updates, {patch: true, method: 'update'});

    flash.addFlashMessage( ctx.session, 'info', 'Successfully deleted your account.');
    ctx.redirect('/');
}));


module.exports = { userApp};