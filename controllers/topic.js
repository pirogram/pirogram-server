'use strict';
require('babel-register')({
    presets: ["es2015", "react", "stage-2"]
});
require('babel-polyfill');

const Koa = require('koa');
const router = require( 'koa-route');
const models = require( '../models');
const cms = require( '../cms');
const redis = require( '../lib/redis');
const flash = require( '../lib/flash');
const _ = require('lodash');
const React = require('react');
const ReactDOMServer = require('react-dom/server');
const TopicEditorComponent = require('../client/components/topic-editor.jsx').default;
const TopicComponent = require('../client/components/topic.jsx').default;

const topicApp = new Koa();


async function lookupTopic( slug) {
    let cachedTopic = await redis.hget( 'topics', slug);
    if( cachedTopic) { return JSON.parse( cachedTopic); }

    const topic = await models.getTopicBySlug( slug);

    if( topic) {
        cachedTopic = makeCacheableTopic( topic);
        //await redis.hset( 'topics', slug, JSON.stringify( cachedTopic));
    }

    return cachedTopic;
}


async function decorateToc( cachedToc, user) {
    const topicIds = [];

    const th = await models.getTopicHistory( user.id, topicIds);

    for( let topicStub of cachedToc.topics) {
        if( th[ topicStub.id]) { topicStub.done = true; }

        for( let childTopicStub of topicStub.topics) {
            if( th[ childTopicStub.id]) { childTopicStub.done = true;}
        }
    }
}


function getNextPrevTopics( m, topicSlug) {
    let prevTopic = null;
    let nextTopic = null;

    const index = _.find( m.topics, {slug: topicSlug});
    if( index > 0) {
        prevTopic = m.topics[index-1];
    }
    if( index < m.topics.length-1) {
        nextTopic = m.topics[index+1];
    }

    return {prevTopic, nextTopic};
}


async function decorateTopic(cachedTopic, user) {
    const exerciseIds = [];
    cachedTopic.contentList.map((content, i) => {
        if( content.type != "markdown") {
            exerciseIds.push(content.id);
        }
    });

    const eh = await models.getExerciseHistory(user.id, exerciseIds);
    cachedTopic.contentList.map((content, i) => {
        if(eh[content.id]) {
            content.done = true;
            content.solution = eh[content.id].attributes.solution;
        }
    });
}


topicApp.use( router.get( '/topic/:tocSlug', async function( ctx, tocSlug, topicSlug) {
    const cachedToc = await toc.lookupToc( tocSlug);

    ctx.redirect(`/topic/${tocSlug}/${cachedToc.slugs[0]}`);
}));


async function generateTocTopics( m, userId) {
    let th = {};
    if( userId) {
        const topicIds = [];
        for( const t of m.topics) { topicIds.push( t.id); }

        th = models.getTopicHistory( userId, topicIds);
    }

    const tocTopics = [];
    let currTopic = null;
    for( const t of m.topics) {
        const tocTopic = { slug: t.slug, name: t.name, tocName: t.tocName ? t.tocName : t.name};
        if( th[ t.id]) {
            tocTopic.done = true;
        }

        if( t.level == 1 || !currTopic) {
            tocTopic.topics = [];
            currTopic = tocTopic;
            tocTopics.push( tocTopic);
        } else {
            currTopic.topics.push( tocTopic);
        }
    }

    return tocTopics;
}


topicApp.use( router.get( '/topic/:moduleSlug/:topicSlug', async function( ctx, moduleSlug, topicSlug) {
    let stageName = null;
    if( ctx.state.user && ctx.state.user.superuser && await cms.hasStage( moduleSlug, ctx.state.user.email)) {
        stageName = ctx.state.user.email;
    }

    const m = await cms.getModuleBySlug( moduleSlug, stageName);
    const topic = await cms.getTopicBySlug( m, topicSlug, stageName);

    if( !topic) {
        if( _.find( m.topics, {slug: topicSlug}) && ctx.state.user && ctx.state.user.superuser) {
            ctx.redirect( '/topic/' + moduleSlug + '/' + topicSlug + '/edit');
        } else {
            ctx.status = 404;
        }
        return;
    }

    const tocTopics = await generateTocTopics( m, ctx.state.user ? ctx.state.user.id : null);
    const {prevTopic, nextTopic} = getNextPrevTopics( m, topicSlug);

    const topicHtml = topic.rawContent;
    const hasStage = stageName ? true:false;

    await ctx.render( 'topic', {m, tocTopics, topic, topicHtml, prevTopic, nextTopic, hasStage}, 
        {topicViewer: true, topic: topic, moduleSlug, topicSlug, hasStage});

    /*
    if( ctx.state.user) {
        await decorateToc( cachedToc, ctx.state.user);
        await decorateTopic( cachedTopic, ctx.state.user);
    }

    const {prevTopicSlug, nextTopicSlug} = getNextPrevTopics(topicSlug, cachedToc);

    const topicHtml = ReactDOMServer.renderToString(
        React.createElement( TopicComponent, {topic: cachedTopic, tocSlug, topicSlug, user: ctx.state.user})
    );

    await ctx.render( 'topic', {toc: cachedToc, topic: cachedTopic, topicHtml, prevTopicSlug, nextTopicSlug}, 
        {topicViewer: true, topic: cachedTopic, tocSlug, topicSlug});
        */
}));


topicApp.use( router.get( '/topic/:moduleSlug/:topicSlug/edit', async function( ctx, moduleSlug, topicSlug) {
    if(!ctx.state.user) { ctx.redirect('/login'); return; }
    if(!ctx.state.user.superuser) { 
        flash.addFlashMessage(ctx.session, 'error', 'You do not have permissions to edit a topic.');
        ctx.redirect('/');
        return; 
    }

    const stageName = await cms.hasStage( moduleSlug, ctx.state.user.email) ?  ctx.state.user.email : null;

    const m = await cms.getModuleBySlug( moduleSlug, stageName);
    const topic = await cms.getTopicBySlug( m, topicSlug, stageName);

    const tocTopics = await generateTocTopics( m, ctx.state.user ? ctx.state.user.id : null);
    const topicData = _.find( m.topics, {slug: topicSlug});

    const rawContent = topic ? topic.rawContent : '';
    const editorState = {name: topicData.name, slug: topicSlug, tocName: topicData.tocName, rawContent};
    const topicEditorHtml = ReactDOMServer.renderToString( React.createElement( TopicEditorComponent, editorState));

    await ctx.render( 'topic-edit', 
        Object.assign({tocTopics, topicEditorHtml, m}, editorState), 
        Object.assign({topicEditor: true}, editorState));
}));


topicApp.use( router.post( '/topic/:moduleSlug/:topicSlug/edit', async function( ctx, moduleSlug, topicSlug) {
    if(!ctx.state.user) { ctx.redirect('/login'); return; }
    if(!ctx.state.user.superuser) { 
        flash.addFlashMessage(ctx.session, 'error', 'You do not have permissions to edit a topic.');
        ctx.redirect('/');
        return; 
    }

    const isSave = ctx.request.body.fields.hasOwnProperty('save');
    if( !isSave) {
        ctx.redirect(`/topic/${tocSlug}/${topicSlug}`);
        return;
    }

    const stageName = ctx.state.user.email;

    const m = await cms.getModuleBySlug( moduleSlug, stageName);

    const newName = ctx.request.body.fields.name.trim();
    const newTocName = ctx.request.body.fields.tocName.trim();
    const newSlug = ctx.request.body.fields.slug.trim();
    const newRawContent = ctx.request.body.fields.rawContent.trim();

    await cms.updateTopic( m, topicSlug, stageName, newName, newTocName, newSlug, newRawContent);

    ctx.redirect(`/topic/${moduleSlug}/${newSlug}`);

    /*
    const cachedToc = await toc.lookupToc( tocSlug);
    const topic = await models.getTopicBySlug( topicSlug);

    const title = ctx.request.body.fields.title;
    const markdown = ctx.request.body.fields.markdown;
    const isSave = ctx.request.body.fields.hasOwnProperty('save');

    if( isSave) {
        await models.saveTopic(topicSlug, title, markdown, ctx.state.user.id);
        await saveExercises(markdown);
    }

    ctx.redirect(`/topic/${tocSlug}/${topicSlug}`);
    */
}));


topicApp.use( router.post( '/topic/:tocSlug/:topicSlug/done', async function( ctx, tocSlug, topicSlug) {
    if(!ctx.state.user) { ctx.redirect('/login'); return; }
    
    const cachedToc = await toc.lookupToc( tocSlug);
    const cachedTopic = await lookupTopic( topicSlug);

    const th = await models.getTopicHistory( ctx.state.user.id, [cachedTopic.id]);

    if( th && th[cachedTopic.id]) {
        ctx.body = JSON.stringify( {status: 'ok'});
    } else {
        await models.saveTopicHistory(ctx.state.user.id, cachedTopic.id);
        ctx.body = JSON.stringify({status: 'ok'});
    }
}));


topicApp.use( router.get( '/exercise/:uuid/solution', async function( ctx, uuid) {
    const exercise = await models.getExerciseById(uuid);
    const exerciseObj = turtleMarkdown.convertQuizContent(exercise.attributes.type, 
        exercise.attributes.id, exercise.attributes.markdown);

    if( exercise.attributes.type == 'mcquiz') {
        const correctOptions = _.map( _.filter(exerciseObj.options, {correct: true}), 'key');
        ctx.body = JSON.stringify({status: 'ok', data: {correctOptions}});
    } else if( exercise.attributes.type == 'regexquiz') {
        ctx.body = JSON.stringify({status: 'ok', data: {solution: exerciseObj.solution}});
    } else if( exercise.attributes.type == 'offline-exercise') {
        ctx.body = JSON.stringify({status: 'ok', data: {solution: exerciseObj.solutionHtml}});
    }
}));

topicApp.use( router.post( '/exercise/:uuid/done', async function( ctx, uuid) {
    if(!ctx.state.user) { ctx.redirect('/login'); return; }
    
    const exercise = await models.getExerciseById(uuid);
    const solution = ctx.request.body.solution;

    await models.saveExerciseHistory(ctx.state.user.id, uuid, solution);
    ctx.body = JSON.stringify({status:'ok'});
}));

module.exports = { topicApp};