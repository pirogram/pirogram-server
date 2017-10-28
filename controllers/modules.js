'use strict;'

const Koa = require('koa');
const router = require( 'koa-route');
const cms = require( '../cms');
const flash = require( '../lib/flash');
const slugifier = require('slug')
const _ = require('lodash');
const uuid = require('uuid');
import {ensureSuperuser} from '../lib/util';

const modulesApp = new Koa();


modulesApp.use( router.get( '/modules', async function(ctx) {
    if( !ensureSuperuser( ctx)) { return; }

    const modules = await cms.getAllModules();
    await ctx.render('modules', {modules});
}));


modulesApp.use( router.get( '/modules/create', async function(ctx) {
    if( !ensureSuperuser( ctx)) { return; }

    await ctx.render('module-create');
}));


modulesApp.use( router.post( '/modules/create', async function(ctx) {
    if( !ensureSuperuser( ctx)) { return; }

    const name = ctx.request.body.fields.name.trim();
    const slug = ctx.request.body.fields.slug.trim();

    if(!name || !slug) {
        flash.addFlashMessage(ctx.session, 'error', 'name & slug are mandatory fields.');
        await ctx.render('module-create', {name, slug});
        return;
    }

    let m = await cms.getModuleBySlug( slug);
    if( m) {
        flash.addFlashMessage(ctx.session, 'error', 'This slug is already in use.');
        await ctx.render('module-create', {name, slug});
        return;
    }

    m = await cms.createModule( slug, name);
    ctx.redirect('/topic/' + m.slug + '/' + m.topics[0].slug);
}));


modulesApp.use( router.post( '/module/:moduleSlug/publish', async function(ctx, moduleSlug) {
    if( !ensureSuperuser( ctx)) { return; }

    const stageName = ctx.state.user.email;

    if( !await cms.hasStage( moduleSlug, stageName)) {
        flash.addFlashMessage(ctx.session, 'warning', 'Did not find any changes to publish.');
        ctx.redirect(`/module/${moduleSlug}`)
        return;
    }

    await cms.publishStage(moduleSlug, stageName);
    ctx.redirect(`/module/${moduleSlug}`)
}));


modulesApp.use( router.get( '/module/:moduleSlug', async function(ctx, moduleSlug) {
    const m = await cms.getModuleBySlug( moduleSlug);

    ctx.redirect(`/topic/${m.slug}/${m.topics[0].slug}`)
}));


function getTocAsText( m) {
    const lines = [];
    for( const topic of m.topics) {
        if( topic.level == 1) {
            lines.push( topic.tocName);
        } else {
            lines.push( '    ' + topic.tocName);
        }
    }

    return lines.join('\n');
}

modulesApp.use( router.get( '/module/:moduleSlug/toc-edit', async function(ctx, moduleSlug) {
    if( !ensureSuperuser( ctx)) { return; }

    const stageName = await cms.hasStage( moduleSlug, ctx.state.user.email) ? ctx.state.user.email : null;

    const m = await cms.getModuleBySlug( moduleSlug, stageName);
    if( !m) {
        ctx.status = 404;
        return;
    }

    const tocAsText = getTocAsText( m);
    await ctx.render( 'toc-edit', {m, tocAsText});
}));


function getUpdatedToC( m, tocAsText) {
    const updatedTopics = [];
    for( const line of tocAsText.split('\n')) {
        let level = 1;
        if( line[0] == ' ' || line[0] == '\t') { level = 2; }

        if( !line.trim()) continue;
        
        const topicName = line.trim();
        const existingTopic = _.find( m.topics, {tocName: topicName});
        if( existingTopic) {
            existingTopic.level = level;
            updatedTopics.push( existingTopic);
        } else {
            const topicSlug = slugifier( topicName).toLowerCase();
            updatedTopics.push( {id: uuid.v4(), name: topicName, tocName: topicName, slug: topicSlug, filename: topicSlug + '.smd', level});
        }
    }

    return updatedTopics;
}


modulesApp.use( router.post( '/module/:moduleSlug/toc-edit', async function(ctx, moduleSlug) {
    if( !ensureSuperuser( ctx)) { return; }

    const stageName = ctx.state.user.email;
    const m = await cms.getModuleBySlug( moduleSlug, stageName);
    if( !m) {
        ctx.status = 404;
        return;
    }

    const tocAsText = ctx.request.body.fields.tocAsText.trim();
    if( !tocAsText) {
        flash.addFlashMessage( ctx.session, 'error', 'ToC cannot be empty.');
        await ctx.render( 'toc-edit', {m, tocAsText});
        return;
    }

    const updatedTopics = getUpdatedToC( m, tocAsText);
    await cms.updateToC( m, updatedTopics, stageName);

    ctx.redirect(`/module/${moduleSlug}`);
}));


module.exports = {modulesApp};