'use strict;'
require('babel-register')({
    presets: ["es2015", "react", "stage-2"]
});
require('babel-polyfill');

const Koa = require('koa');
const router = require( 'koa-route');
const _ = require('lodash');
const hljs = require('highlight.js');
const models = require( '../models');
const {logger} = require('../lib/logger');
const {CodeExecutor} = require('../lib/code-executor');
const contentView = require('../lib/content-view');
const cms = require('../lib/cms');
const flash = require('../lib/flash');
import {ensureUser} from '../lib/util';

import Topic from '../client/components/topic.jsx';
import CodeExplorer from '../client/components/code-explorer';
const React = require('react');
const ReactDOMServer = require('react-dom/server');

const packagesApp = new Koa();


async function addUserStateToPackage( p, userId) {
    const topicIds = p.topics.map((topic, index) => {
        return topic.meta.compositeId;
    });

    const thObjs = await models.getTopicHistory( userId, topicIds);
    p.topics.map( (topic, index) => {
        if( thObjs[topic.meta.compositeId]) topic.meta.done = true;
    });

    if( await models.getSinglePackageHistory( userId, p.meta.code)) { p.meta.done = true; }
}


packagesApp.use( router.get( '/packages', async function(ctx) {
    const packageSummaryDict = await cms.getAllLivePackageSummary();
    const userId = ctx.state.user ? ctx.state.user.id : null;
    const username = ctx.state.user ? ctx.state.user.username.toLowerCase() : null;

    _.keys( packageSummaryDict).map( (key, i) => {
        const p = packageSummaryDict[ key];
        if( p.meta.status == 'draft' && username != "manasgarg" && username != "vaishaligarg") {
            delete( packageSummaryDict[ key]);
        }
    });

    const packageSummaryList = _.values(packageSummaryDict);
    
    const packageListHtml = '';

    await ctx.render('packages', {packageSummaryList, packageListHtml}, {packageSummaryList, userId});
}));


packagesApp.use( router.post( '/@:packageCode/add-to-queue', 
        async function(ctx, packageCode) {
    if( !ensureUser( ctx)) { return; }

    const pirep = cms.getLivePackageInfo( packageCode);

    if( !pirep) {
        ctx.status = 404;
        ctx.body = 'Package Not Found';
        return;
    }

    await models.addPackageToQueue( ctx.state.user.id, pirep.id);

    ctx.status = 200;
}));


packagesApp.use( router.post( '/@:packageCode/remove-from-queue', 
        async function(ctx, packageCode) {
    if( !ensureUser( ctx)) { return; }

    const pirep = cms.getLivePackageInfo( packageCode);

    if( !pirep) {
        ctx.status = 404;
        ctx.body = 'Package Not Found';
        return;
    }

    await models.removePackageFromQueue( ctx.state.user.id, pirep.id);

    ctx.status = 200;
}));


packagesApp.use( router.get( '/@:packageCode', async function( ctx, packageCode) {
    const p = cms.getLivePackage( packageCode);
    if( !p) {
        ctx.status = 404;
        return;
    }

    ctx.redirect(`/@${packageCode}/${p.topics[0].meta.code}`);
}));


packagesApp.use( router.get( '/@:packageCode/:topicCode', 
        async function( ctx, packageCode, topicCode) {
    
    const userId = ctx.state.user ? ctx.state.user.id : null;
    const p = cms.getLivePackage( packageCode);
    if( !p) { ctx.status = 404; return; }

    let topicIndex = _.findIndex(p.topics, { meta: {code: topicCode}});
    if( topicIndex < 0) { ctx.redirect(`/@${packageCode}`); return; }
    
    const presentableTopic = contentView.makePresentableTopic(p.topics[topicIndex]);

    if( userId) {
        await contentView.addUserStateToTopic( presentableTopic, userId);
        await addUserStateToPackage(p, userId);
    }

    let nextTopic, prevTopic;
    if( topicIndex > 0) prevTopic = p.topics[topicIndex - 1];
    if( topicIndex < p.topics.length - 1) nextTopic = p.topics[topicIndex + 1];

    const topicHtml = ReactDOMServer.renderToString(
        <Topic topic={presentableTopic} userId={userId}/>
    );

    if( userId) markDoneTopicAsDone( userId, presentableTopic, p);

    await ctx.render( 'topic', {p, topic: presentableTopic, topicHtml, nextTopic, prevTopic}, 
        {p, topic: presentableTopic});
}));

packagesApp.use( router.get( '/playground', async function( ctx){
    if( !ctx.state.user) {
        flash.addFlashMessage(ctx.session, 'info', 'Please login to access shell.');
        ctx.redirect('/login');
        return;
    }

    const liveCodeHtml = ReactDOMServer.renderToString(<CodeExplorer id=''
        userId={ctx.state.user.id} starterCode='# code goes here ...' userCode=''/>
    );

    await ctx.render('playground', {liveCodeHtml}, {hasGeneralCodePlayground: true});
}));


async function markDoneTopicAsDone( userId, topic, p) {
    const th = await models.getTopicHistory( userId, [topic.meta.compositeId]);
    if( th[topic.meta.compositeId]) {
        await markDonePackageAsDone( userId, p);
        return;
    }

    const exerciseIds = contentView.getExerciseIds( topic);

    if( exerciseIds.length) {
        const eh = await models.getExerciseHistory( userId, exerciseIds);
        for( const id of exerciseIds) {
            if( !eh[id]) {
                return;
            }
        }
    }

    await models.saveTopicHistory( userId, topic.meta.compositeId);
    await markDonePackageAsDone( userId, p);
}


async function markDonePackageAsDone( userId, p) {
    const topicIds = p.topics.map((topic, index) => {
        return topic.meta.compositeId;
    });

    const thObjs = await models.getTopicHistory( userId, topicIds);
    if( _.keys( thObjs).length != topicIds.length) return;

    await models.savePackageHistory( userId, p.meta.code);
}


packagesApp.use( router.post( '/exercise/:exerciseId/solution', async function( ctx, exerciseId) {
    if( !ensureUser( ctx)) { return; }

    const [p, topic, exercise] = cms.getSectionLineageById( exerciseId);

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
            codeExecutor = CodeExecutor.get(); 
            const dir = `/home/jupyter/content/live/packages/${p.meta.code}`;
            await codeExecutor.execute(`import os\nos.chdir('${dir}')\nimport matplotlib.pyplot\n`);
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
            const blankRegex = new RegExp(blank.answer);

            if( !userAnswer || !userAnswer.match(blankRegex)) {
                corrections[label] = blank.answer;
                solutionIsCorrect = false;
            }
        }

        if( solutionIsCorrect) {
            await models.saveExerciseHistory( ctx.state.user.id, exerciseId, {answers});
        }

        ctx.body = JSON.stringify({solutionIsCorrect, corrections});
    }

    await markDoneTopicAsDone( ctx.state.user.id, topic, p);
}));


packagesApp.use( router.get( '/book/:bookCode', async function( ctx, bookCode) {
    const books = cms.getBooksList();
    const book = _.find(books, {code: bookCode});
    if( !book) { ctx.status = 404; return; }

    await ctx.render('book', {book});
}));


module.exports = {packagesApp};