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
const structmd = require( '../lib/structmd');
const util = require( '../lib/util');
const _ = require('lodash');
const React = require('react');
const ReactDOMServer = require('react-dom/server');
const pageStore = require('../client/store');
import Topic from '../client/components/topic.jsx';

const topicApp = new Koa();


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


async function generateTocTopics( m, userId) {
    let th = {};
    if( userId) {
        const topicIds = [];
        for( const t of m.topics) { topicIds.push( t.id); }

        th = await models.getTopicHistory( userId, topicIds);
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


async function getPageStore( user, m, topic) {
    const ps = new pageStore.PageStore();
    ps.topic = new pageStore.TopicStore();
    ps.m = Object.assign( new pageStore.ModuleStore(), {slug: m.slug, name: m.name});

    const baseContentList = structmd.parse( topic.rawContent);
    const exerciseIds = [];
    const playgroundIds = [];

    for( const baseContent of baseContentList) {
        let pageContent = null;
        if( baseContent instanceof structmd.MarkdownContent) {
            pageContent = new pageStore.HtmlContentStore();
            pageContent.html = util.commonmarkToHtml( baseContent.markdown);
        } else if( baseContent instanceof structmd.MultipleChoiceContent) {
            exerciseIds.push( baseContent.id);

            pageContent = new pageStore.MultipleChoiceContentStore();
            Object.assign( pageContent, { compositeId: `${m.slug}::${topic.slug}::${baseContent.id}`, 
                id: baseContent.id, question: util.commonmarkToHtml( baseContent.question), 
                code: baseContent.code, choiceOptions: [], done: false, isExercise: true});
            
            for( const choiceOption of baseContent.choiceOptions) {
                pageContent.choiceOptions.push(
                    Object.assign(new pageStore.ChoiceOptionStore(), 
                        {id: choiceOption.id, html: util.commonmarkToHtml(choiceOption.markdown)})
                );
            }
        } else if( baseContent instanceof structmd.CodePlaygroundContent) {
            pageContent = Object.assign( new pageStore.CodePlaygroundContentStore(), 
                {id: baseContent.id, lang: baseContent.lang, code: baseContent.code});
            
            if( baseContent.id) { playgroundIds.push( baseContent.id); }
        } else if( baseContent instanceof structmd.CodingProblemContent) {
            pageContent = Object.assign( new pageStore.CodingProblemContentStore(), {
                id: baseContent.id, problemStatement: util.commonmarkToHtml( baseContent.problemStatement), 
                referenceSolution: baseContent.referenceSolution,
                starterCode: baseContent.starterCode, tests: baseContent.tests
            });
        }

        if( pageContent) {
            ps.topic.contentList.push( pageContent);
        }
    }

    if( user) {
        if( exerciseIds.length) {
            const eh = await models.getExerciseHistory( user.id, exerciseIds);
            for( const pageContent of ps.topic.contentList) {
                if( !pageContent.id || !eh[pageContent.id]) { continue; }

                pageContent.done = true;
                pageContent.selectedIds = eh[pageContent.id].solution.selectedIds;
            }
        }

        if( playgroundIds.length) {
            const playgroundDataset = await models.getPlaygroundDataset( user.id, playgroundIds);
            for( const pageContent of ps.topic.contentList) {
                if( !pageContent.id || !playgroundDataset[pageContent.id]) { continue; }

                pageContent.userCode = playgroundDataset[pageContent.id].code;
            }
        }

        ps.user = {id: user.id, name: user.name};
    }

    return ps;
}


async function getCurrentStageName( ctx, moduleSlug) {
    let stageName = null;
    if( ctx.state.user && ctx.state.user.superuser && await cms.hasStage( moduleSlug, ctx.state.user.email)) {
        stageName = ctx.state.user.email;
    }

    return stageName;
}


async function markBlankTopicAsDone( userId, topicId, pageContentList) {
    if( !userId) return;

    for( const pageContent of pageContentList) {
        if( pageContent.isExercise) { return; }
    }

    await models.saveTopicHistory( userId, topicId);
}


async function markDoneTopicAsDone( userId, topicId, contentList) {
    const th = await models.getTopicHistory( userId, [topicId]);
    if( th[topicId]) return;

    const exerciseIds = [];
    for( const content of contentList) {
        if( content.isExercise) { 
            exerciseIds.push( content.id); 
        }
    }

    const eh = await models.getExerciseHistory( userId, exerciseIds);
    for( const exerciseId of exerciseIds) {
        if( !eh[exerciseId]) {
            return;
        }
    }

    await models.saveTopicHistory( userId, topicId);
}


topicApp.use( router.get( '/topic/:moduleSlug/:topicSlug', async function( ctx, moduleSlug, topicSlug) {
    const stageName = await getCurrentStageName( ctx, moduleSlug);
    const m = await cms.getModuleBySlug( moduleSlug, stageName);
    if( !m) { ctx.status = 404; return; }

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

    const ps = await getPageStore( ctx.state.user, m, topic);
    const userId = ctx.state.user ? ctx.state.user.id : 0;

    const topicHtml = ReactDOMServer.renderToString(
        <Topic m={ps.m} topic={ps.topic} userId={userId}/> 
    );
    const hasStage = stageName ? true:false;

    await markBlankTopicAsDone( userId, topic.id, ps.topic.contentList);

    await ctx.render( 'topic', {m, tocTopics, topic, topicHtml, prevTopic, nextTopic, hasStage}, ps);
}));


topicApp.use( router.get( '/topic/:moduleSlug/:topicSlug/edit', async function( ctx, moduleSlug, topicSlug) {
    if(!ctx.state.user) { ctx.redirect('/login'); return; }
    if(!ctx.state.user.superuser) { 
        flash.addFlashMessage(ctx.session, 'error', 'You do not have permissions to edit a topic.');
        ctx.redirect('/');
        return; 
    }

    const stageName = await getCurrentStageName( ctx, moduleSlug);

    const m = await cms.getModuleBySlug( moduleSlug, stageName);
    const topic = await cms.getTopicBySlug( m, topicSlug, stageName);

    const tocTopics = await generateTocTopics( m, ctx.state.user ? ctx.state.user.id : null);
    const topicData = _.find( m.topics, {slug: topicSlug});

    const rawContent = topic ? topic.rawContent : '';
    const editorState = {name: topicData.name, slug: topicSlug, tocName: topicData.tocName, rawContent};
    //const topicEditorHtml = ReactDOMServer.renderToString( React.createElement( TopicEditorComponent, editorState));

    await ctx.render( 'topic-edit', Object.assign({tocTopics, m}, editorState));
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
        ctx.redirect(`/topic/${moduleSlug}/${topicSlug}`);
        return;
    }

    const stageName = ctx.state.user.email;

    const m = await cms.getModuleBySlug( moduleSlug, stageName);
    const topic = await cms.getTopicBySlug( m, topicSlug, stageName);

    const newName = ctx.request.body.fields.name.trim();
    const newTocName = ctx.request.body.fields.tocName.trim();
    const newSlug = ctx.request.body.fields.slug.trim();
    const newRawContent = ctx.request.body.fields.rawContent.trim();

    if( topic.rawContent == newRawContent) {
        ctx.redirect(`/topic/${moduleSlug}/${topicSlug}`);
        return;
    }

    await cms.updateTopic( m, topicSlug, stageName, newName, newTocName, newSlug, newRawContent);

    ctx.redirect(`/topic/${moduleSlug}/${newSlug}`);
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


topicApp.use( router.post( '/exercise/:compositeId/solution', async function( ctx, compositeId) {
    if(!ctx.state.user) { ctx.status = 400; ctx.body = JSON.stringify({error: 'login required'}); return; }

    const [moduleSlug, topicSlug, ...rest] = compositeId.split('::');
    const exerciseId = rest.join('::');

    const stageName = await getCurrentStageName( ctx, moduleSlug);
    const m = await cms.getModuleBySlug( moduleSlug, stageName);
    if( !m) { ctx.status = 404; ctx.body = 'module not found.'; return; }

    const topic = await cms.getTopicBySlug( m, topicSlug, stageName);
    if( !topic) { ctx.status = 404; ctx.body = 'topic not found'; return; }

    const contentList = structmd.parse( topic.rawContent);

    let exerciseContent = null;
    for( const content of contentList) {
        if( content.id == exerciseId) {
            exerciseContent = content;
            break;
        }
    }

    if( !exerciseContent) { ctx.status = 404; ctx.body = 'exercise not found'; return; }

    if( exerciseContent instanceof structmd.MultipleChoiceContent) {
        const selectedIds = ctx.request.body.selectedIds;
        const correctIds = exerciseContent.correctIds;
        const solutionIsCorrect = _.isEqual( selectedIds.sort(), correctIds.sort());
        if( solutionIsCorrect) {
            await models.saveExerciseHistory(ctx.state.user.id, exerciseId, {selectedIds});
        }

        ctx.body = JSON.stringify({solutionIsCorrect, correctIds});
    } else {
        ctx.status = 404;
    }

    await markDoneTopicAsDone( ctx.state.user.id, topic.id, contentList);
}));

module.exports = { topicApp};