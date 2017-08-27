'use strict';
require('babel-register')({
    presets: ["es2015", "react", "stage-2"]
});
require('babel-polyfill');

const Koa = require('koa');
const router = require( 'koa-route');
const models = require( '../models');
const flash = require( '../lib/flash');
const toc = require( '../lib/toc');
const redis = require( '../lib/redis');
const turtleMarkdown = require( '../lib/turtle-markdown');
const _ = require('lodash');
const React = require('react');
const ReactDOMServer = require('react-dom/server');
const TopicEditorComponent = require('../client/components/topic-editor.jsx').default;
const TopicComponent = require('../client/components/topic.jsx').default;

const topicApp = new Koa();

function makeCacheableTopic( topic) {
    const attrs = topic.attributes;
    const contentList = turtleMarkdown.parseMarkdown( attrs.markdown);

    return {
        id: attrs.id,
        slug: attrs.slug,
        title: attrs.title,
        version_number: attrs.version_number,
        markdown: attrs.markdown,
        contentList: contentList
    };
}


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


function getNextPrevTopics( topicSlug, cachedToc) {
    let prevTopicSlug = null;
    let nextTopicSlug = null;

    const slugIndex = cachedToc.slugs.indexOf( topicSlug);
    if( slugIndex > 0) {
        prevTopicSlug = cachedToc.slugs[slugIndex-1];
    }
    if( slugIndex < cachedToc.slugs.length - 1) {
        nextTopicSlug = cachedToc.slugs[slugIndex+1];
    }

    return {prevTopicSlug, nextTopicSlug};
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


topicApp.use( router.get( '/topic/:tocSlug/:topicSlug', async function( ctx, tocSlug, topicSlug) {
    const cachedToc = await toc.lookupToc( tocSlug);
    const cachedTopic = await lookupTopic( topicSlug);

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
}));


topicApp.use( router.get( '/topic/:tocSlug/:topicSlug/edit', async function( ctx, tocSlug, topicSlug) {
    if(!ctx.state.user) { ctx.redirect('/login'); return; }

    const cachedToc = await toc.lookupToc( tocSlug);
    const topic = await models.getTopicBySlug( topicSlug);

    let title = topicSlug;
    let markdown = '';
    if( topic) {
        title = topic.attributes.title;
        markdown = topic.attributes.markdown;
    }

    const topicEditorHtml = ReactDOMServer.renderToString(
        React.createElement( TopicEditorComponent, {title, markdown})
    );

    await ctx.render( 'topic_edit', {toc: cachedToc, topicEditorHtml, topic, title}, {topicEditor: true, title, markdown});
}));


async function saveExercises(markdown) {
    const contentList = turtleMarkdown.parseMarkdown(markdown);
    contentList.map(async function (content) {
        if( content.type === 'mcquiz'
                || content.type === 'regexquiz'
                || content.type === 'offline-exercise') {
            await models.saveExercise(content.id, content.type, content.markdown);
        }
    });
}


topicApp.use( router.post( '/topic/:tocSlug/:topicSlug/edit', async function( ctx, tocSlug, topicSlug) {
    if(!ctx.state.user) { ctx.redirect('/login'); return; }
    
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