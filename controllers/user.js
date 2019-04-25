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
const fs = require('fs');
const {promisify} = require('util');
const {exec} = require('../lib/subprocess');
const aws = require("aws-sdk");
aws.config.update( {
    region: 'us-west-1',
    accessKeyId: config.get('aws.key_id'),
    secretAccessKey: config.get('aws.key_secret')
});

const SALT_ROUNDS = 5;

const userApp = new Koa();

userApp.use( router.get( '/account/update', async function( ctx) {
    if( !ensureUser( ctx)) { return; }

    const user = await models.getUserById( ctx.state.user.id);
    const username = user.name;
    const blurb = user.blurb || '';
    const password = user.password;
    await ctx.render( 'edit-profile', {username, blurb, password});    
}));

async function uploadToAWS( filePath) {
    const s3 = new aws.S3({
        apiVersion: '2006-03-01'
    });

    const stream = fs.createReadStream( filePath);

    return new Promise( (resolve, reject) => {
        stream.on( 'error', (err) => { reject(err); });

        s3.upload( {
            ACL: 'public-read',
            Bucket: 'pirogram-profiles',
            Body: stream,
            Key: filePath.split('/').pop(),
            ContentType: 'image/jpeg'
        }, function( err, data) {
            if( err) { reject( err); }
            else { resolve(); }
        });
    });
}

async function uploadImage( image) {
    const suffix = image.name.split('.').pop().toLowerCase();
    const newPath = `${image.path}.${suffix}`;
    const jpgPath = (suffix == 'jpg' || suffix == 'jpeg') ? newPath : `${image.path}.jpg`;
    const squarePath = `/tmp/${uuidv4()}.jpg`;

    const rename = promisify( fs.rename);
    await rename( image.path, newPath);
    if( newPath != jpgPath) {
        await exec(`magick convert ${newPath} ${jpgPath}`);
    }

    await exec( `convert`, ['-define', 'jpeg:size=400x400', jpgPath, '-thumbnail', '400x400^', 
        '-gravity', 'center', '-extent', '400x400', squarePath]);

    await uploadToAWS( squarePath);

    const unlink = promisify( fs.unlink);
    if( newPath != jpgPath) {
        await unlink( newPath);
    }
    await unlink( jpgPath);
    await unlink( squarePath);

    return `https://pirogram-profiles.s3.amazonaws.com/${squarePath.split('/').pop()}`;
}

userApp.use( router.post( '/account/update', async function( ctx) {
    if( !ensureUser( ctx)) { return; }

    const user = await models.getUserById( ctx.state.user.id);

    const errors = {};
    const username = ctx.request.body.fields.username || '';
    const blurb = ctx.request.body.fields.blurb || '';

    if( !validator.isLength( username, {min: 5, max: 24}) ||
        !validator.matches( username, /^([a-zA-Z0-9-]+)$/)) {
        errors['username'] = 'Username must be 5 to 24 characters. Alphanumeric and - allowed.';
    }

    if( username.toLowerCase() != user.username && !await models.isUsernameAvaialble( username)) {
        errors['username'] = 'Sorry, this username is already taken.';
    }

    if( !validator.isLength( blurb, {min: 0, max: 256})) {
        errors['blurb'] = 'Blurb must not be more than 256 characters.';
    }
    
    if( _.keys(errors).length > 0) {
        await ctx.render('edit-profile', {errors, username, blurb});
        return;
    }

    if( ctx.request.body.files.image) {
        const imageUrl = await uploadImage( ctx.request.body.files.image);
        await models.query('UPDATE users SET avatar=$1 WHERE id = $2', [imageUrl, ctx.state.user.id]);
    }

    //const updates = {username: username.toLowerCase(), name: username, blurb: blurb};
    //await models.User.where({id: ctx.state.user.id}).save(updates, {patch: true, method: 'update'});
    await models.query('UPDATE users SET username = $1, name = $2, blurb = $3 WHERE id = $4',
        [username.toLowerCase(), username, blurb, ctx.state.user.id]);

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

    if( username.toLowerCase() != user.username) {
        errors['username'] = 'Sorry, you entered incorrect username.';
    }

    if( _.keys(errors).length > 0) {
        await ctx.render('delete-profile', {username, errors});
        return;
    }

    /*const updates = {
        is_deleted: true, 
        username: `user.${user.id}`, 
        name: `user.${user.id}`, 
        email: `user.${user.id}@does-not-exist.com`, 
        avatar: ''
    };*/
    //await models.User.where({id: ctx.state.user.id}).save(updates, {patch: true, method: 'update'});
    await models.query('UPDATE users SET is_deleted = $1, username = $2, name = $3, email = $4, avatar = $5 WHERE id = $6',
        [true, `user.${user.id}`, `user.${user.id}`, `user.${user.id}@does-not-exist.com`, '', ctx.state.user.id]);

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

    console.log( passwordResetRequest.created_at );
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

    const userId = passwordResetRequest.user_id;
    const hashedPassword = await bcrypt.hash( password1, SALT_ROUNDS);
    //await models.User.forge({id: userId}).save({password: hashedPassword}, {method: 'update', patch: true});
    await models.query('UPDATE users SET password = $1 WHERE id = $2',
        [hashedPassword, userId]);

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
    //await models.User.forge({id: ctx.state.user.id}).save({password: hashedPassword}, {method: 'update', patch: true});
    await models.query('UPDATE users SET password = $1 WHERE id = $2',
        [hashedPassword, ctx.state.user.id]);

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

    if( await bcrypt.compare( password, user.password)) {
        ctx.session.userId = user.id;
        ctx.redirect('/');
    } else {
        flash.addFlashMessage( ctx.session, 'error', 'Incorrect username/email and password. Please try again.');
        await ctx.render('login');
    }
}))

module.exports = { userApp};