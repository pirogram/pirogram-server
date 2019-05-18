'use strict;'
require('babel-register')({
    presets: ["es2015", "react", "stage-2"]
});
require('babel-polyfill');

const Koa = require('koa');
const router = require( 'koa-route');
const _ = require('lodash');
const models = require( '../models');
const {logger} = require('../lib/logger');
const cms = require('../lib/cms');
const userstate = require('../lib/userstate');
import {ensureUser} from '../lib/util';
import TOC from '../client/components/toc.jsx';
import Topic from '../client/components/topic.jsx';
import CodeExplorer from '../client/components/code-explorer';
const React = require('react');
const ReactDOMServer = require('react-dom/server');

const bookPageApp = new Koa();

bookPageApp.use( router.get( '/@:bookCode', async function( ctx, bookCode) {
    const userId = ctx.state.user ? ctx.state.user.id : null

    const book = cms.getBookByCode( bookCode)
    if( !book) { ctx.status = 404; return; }

    if( userId) {
        const lastTopicCode = await userstate.getLastVisitedTopic( userId, bookCode)
        if( lastTopicCode) {
            ctx.redirect(`/@${bookCode}/${lastTopicCode}`)
            return
        }
    }

    ctx.redirect( `/@${bookCode}/${book.topicGroups[0].topics[0].code}`)
}))


bookPageApp.use( router.get( '/@:bookCode/:topicCode', async function( ctx, bookCode, topicCode) {
    const userId = ctx.state.user ? ctx.state.user.id : null
    const book = cms.getBookByCode( bookCode)
    if( !book) { ctx.status = 404; return; }

    const toc = cms.createTOC( book)

    let topic = book.getTopicByCode( topicCode)
    if( !topic) { ctx.status = 404; return; }
    topic = topic.clone()

    const currEntryIndex = {
        jointIndex: topic.index,
        groupIndex: parseInt( topic.index.split('.')[0]), 
        topicIndex: parseInt( topic.index.split('.')[1])
    }

    const {prevTopic, nextTopic} = book.getPrevNext( currEntryIndex.groupIndex, currEntryIndex.topicIndex)

    if( userId) { 
        const thObjs = await userstate.addUserStateToToC( toc, userId);
        await userstate.addUserStateToTopic( topic, userId);

        await userstate.markDoneTopicAsDone( userId, book, topic, thObjs);
        await userstate.markDoneGroupAsDone( userId, book, book.topicGroups[currEntryIndex.groupIndex-1], thObjs)
        await userstate.updateLastVisitedTopic( userId, book.code, topic.code);
    }
    
    const tocHtml = ReactDOMServer.renderToString(
        <TOC toc={toc} currEntryIndex={currEntryIndex} />
    );
    const topicHtml = ReactDOMServer.renderToString(
        <Topic topic={topic}  userId={userId}/>
    );

    await ctx.render( 'bookpage', 
        {book, toc, topic, topicHtml, tocHtml, currEntryIndex, prevTopic, nextTopic}, 
        {toc, topic, currEntryIndex});
}));


bookPageApp.use( router.post( '/exercise/:exerciseId/solution', async function( ctx, exerciseId) {
    if( !ensureUser( ctx)) { return; }

    const [book, topic, exercise] = cms.getSectionLineageById( exerciseId);

    if( !exercise) { ctx.status = 404; ctx.body = 'exercise not found.'; return; }

    if( exercise.type == 'multiple-choice-question') {
        const selectedIds = ctx.request.body.selectedIds || [];
        const correctIds = exercise.correctIds;
        const solutionIsCorrect = _.isEqual( selectedIds.sort(), correctIds.sort());
        if( solutionIsCorrect) {
            await models.saveExerciseHistory(ctx.state.user.id, exerciseId, {selectedIds});
        }

        ctx.body = JSON.stringify({solutionIsCorrect, correctIds});
    } else if( exercise.type == 'coding-question') {
        const inSessionId = ctx.request.body.sessionId;
        const code = ctx.request.body.code;
        const playgroundId = ctx.request.body.playgroundId;
        const viewOnly = ctx.request.body.viewOnly;

        if( !viewOnly) {
            await models.savePlaygroundCode( ctx.state.user.id, playgroundId, code);
        }

        var codeExecutor = null;
        if(inSessionId) { 
            codeExecutor = CodeExecutor.getById(inSessionId); 
        } else { 
            codeExecutor = await CodeExecutor.get(); 
        }

        const {output, hasError, testResults} = await codeExecutor.execute(code, exercise.tests);

        let hasFailedTest = false;
        for( const test of testResults) {
            test.content = hljs.highlight( 'python', test.content, true).value;
            if( test.result != 'ok') { hasFailedTest = true; }
        }

        const solutionIsCorrect = !hasFailedTest && !hasError;
        if( solutionIsCorrect && !viewOnly) {
            await models.saveExerciseHistory( ctx.state.user.id, exerciseId, {code});
        }

        ctx.body = JSON.stringify({output, sessionId: codeExecutor.id, testResults, hasError, 
            solutionIsCorrect});
    } else if( exercise.type == 'categorization-question') {
        const selectedCategories = ctx.request.body.selectedCategories;
        const correctCategories = exercise.mappings;

        let solutionIsCorrect = true;
        _.keys(correctCategories).map((challenge, index) => {
            if( selectedCategories[challenge] != correctCategories[challenge]) {
                solutionIsCorrect = false;
            }
        });

        if( solutionIsCorrect) {
            await models.saveExerciseHistory( ctx.state.user.id, exerciseId, {selectedCategories});
        }
        ctx.body = JSON.stringify({solutionIsCorrect, correctCategories});
    } else if( exercise.type == 'qualitative-question') {
        const answer = ctx.request.body.answer;

        await models.saveExerciseHistory( ctx.state.user.id, exerciseId, {answer});

        ctx.body = JSON.stringify({});
    } else if( exercise.type == 'testless-coding-question') {
        const code = ctx.request.body.code;
        const viewOnly = ctx.request.body.viewOnly;

        if(!viewOnly) {
            await models.saveExerciseHistory( ctx.state.user.id, exerciseId, {code});
        }

        ctx.body = JSON.stringify({});
    } else if( exercise.type == 'fill-in-the-blank-question') {
        const answers = ctx.request.body.answers;
        const corrections = {};

        let solutionIsCorrect = true;
        for( const blank of exercise.blanks) {
            const label = blank.label;
            const userAnswer = answers[label] ? answers[label].trim() : '';

            if( userAnswer != blank.answer) {
                corrections[label] = blank.answer;
                solutionIsCorrect = false;
            }
        }

        if( solutionIsCorrect) {
            await models.saveExerciseHistory( ctx.state.user.id, exerciseId, {answers});
        }

        ctx.body = JSON.stringify({solutionIsCorrect, corrections});
    }

    await userstate.markDoneTopicAsDone( ctx.state.user.id, book, topic);
}));

module.exports = {bookPageApp};