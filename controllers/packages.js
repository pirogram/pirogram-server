'use strict;'
require('babel-register')({
    presets: ["es2015", "react", "stage-2"]
});
require('babel-polyfill');

const Koa = require('koa');
const router = require( 'koa-route');
const send = require('koa-send');
const config = require('config');
const path = require('path');
const fs = require('fs');
const _ = require('lodash');
const hljs = require('highlight.js');
const models = require( '../models');
const {logger} = require('../lib/logger');
const plutoid = require('../lib/plutoid');
const cms = require('../lib/cms');
import {ensureUser, glob} from '../lib/util';

import PackageSummaryList from '../client/components/package-summary-list.jsx';
import Topic from '../client/components/topic.jsx';
const React = require('react');
const ReactDOMServer = require('react-dom/server');

const packagesApp = new Koa();

function makePresentableTopic(p, topic, userId) {
    const presentableTopic = {meta: _.cloneDeep( topic.meta)};

    presentableTopic.sections = topic.sections.map( (section, i) => {
        if( section.type == 'markdown') {
            return {type: 'html', html: section.html};
        } else if( section.type == 'multiple-choice-question') {
            return {
                type: section.type,
                question: section.questionHtml, options: section.options,
                compositeId: section.compositeId, done: false, selectedIds: []
            };
        } else if( section.type == 'live-code') {
            return { type: section.type, id: section.id,
                compositeId: section.compositeId,
                starterCode: section.code};
        } else if( section.type == 'coding-question') {
            return {
                type: section.type, id: section.id,
                compositeId: section.compositeId, done: false,
                starterCode: section.code || '',
                question: section.questionHtml,
                referenceSolution: section.solutionHtml,
                tests: section.testsHtml.map((html, index) => { 
                    return {content: html}; 
                })
            }
        } else if( section.type == 'categorization-question') {
            return {
                type: section.type, id: section.id,
                compositeId: section.compositeId, done: false,
                question: section.questionHtml,
                categories: section.categories, challenges: _.keys(section.mappings)
            }
        } else if( section.type == 'qualitative-question') {
            return {
                type: section.type, id: section.id, compositeId: section.compositeId,
                done: false, question: section.questionHtml
            }
        } else if( section.type == 'fill-in-the-blank-question') {
            return {
                type: section.type, id: section.id, compositeId: section.compositeId,
                done: false, question: section.questionHtml, starterCode: section.code,
                labels: section.blanks.map( (blank, index) => blank.label)
            }
        } else {
            return {type: 'html', html: markdownToHtml(`Unsupported section type: ${section.type}`)};
        }
    });

    return presentableTopic;
}


function getExerciseIds( topic) {
    const compositeIds = [];
    for( const section of topic.sections) {
        if( section.type == 'multiple-choice-question' ||
            section.type == 'coding-question' ||
            section.type == 'categorization-question' ||
            section.type == 'qualitative-question' ||
            section.type == 'fill-in-the-blank-question') { 
            compositeIds.push( section.compositeId);
        }
    }

    return compositeIds;
}


function getPlaygroundIds( topic) {
    const compositeIds = [];
    topic.sections.map( (section, index) => {
        if( section.type == 'live-code' || section.type == 'coding-question' || section.starterCode) { 
            compositeIds.push( section.compositeId);
        }
    });

    return compositeIds;
}

function hasExercises( topic) {
    return getExerciseIds(topic).length > 0;
}


async function addUserStateToTopic( p, presentableTopic, userId) {
    let compositeIds = getExerciseIds( presentableTopic);

    const ehobjs = await models.getExerciseHistory( userId, compositeIds);

    for( const section of presentableTopic.sections) {
        if( !ehobjs[section.compositeId]) {
            continue; 
        }

        const eh = ehobjs[section.compositeId];

        section.done = true;
        if( section.type == 'multiple-choice-question') {
            section.selectedIds = eh.solution.selectedIds;
        } else if( section.type == 'coding-question') {
            section.userCode = eh.solution.code;
        } else if( section.type == 'categorization-question') {
            section.selectedCategories = eh.solution.selectedCategories;
        } else if( section.type == 'qualitative-question') {
            section.answer = eh.solution.answer;
        } else if( section.type == 'fill-in-the-blank-question') {
            section.answers = eh.solution.answers;
        }
    }

    compositeIds = getPlaygroundIds( presentableTopic);
    const playgroundData = await models.getPlaygroundData( userId, compositeIds);

    presentableTopic.sections.map((section, index) => {
        if( playgroundData[ section.compositeId]) {
            section.userCode = playgroundData[ section.compositeId].code;
        }
    });
}


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


async function populateUserQueue( userId, packageMetaDict) {
    const packageIds = await models.getQueuedPackages(userId);
    const packageMetaList = [];
    for( const packageId of packageIds) {
        if( packageMetaDict[packageId]) {
            packageMetaDict[packageId].queued = true;
            packageMetaList.push( packageMetaDict[ packageId]);
        }
    }

    return packageMetaList;
}


async function getQueuedPackages( userId) {
    const packageMetaDict = await cms.getAllLivePackageInfo();
    const packageMetaList = await populateUserQueue( userId, packageMetaDict);
    console.log(packageMetaList);
    const packageIds = packageMetaList.map( (pMeta, index) => { return pMeta.code; });

    const phObjs = await models.getPackageHistory( userId, packageIds);
    packageMetaList.map( (pMeta, index) => {
        if( phObjs[ pMeta.code]) pMeta.done = true;
    })
    
    return _.sortBy( packageMetaList, [function(pMeta) { return pMeta.done ? 1 : 0; }]);
}


packagesApp.use( router.get( '/packages/:packageCode/assets/:level1', 
        async function( ctx, packageCode, level1) {
    await send( ctx, `${packageCode}/assets/${level1}`, {root: config.get('pi_home')});
}));

packagesApp.use( router.get( '/packages/:packageCode/assets/:level1/:level2', 
        async function( ctx, packageCode, level1, level2) {
    await send( ctx, `${packageCode}/assets/${level1}/${level2}`, {root: config.get('pi_home')});
}));

packagesApp.use( router.get( '/packages/:packageCode/assets/:level1/:level2/:level3', 
        async function( ctx, packageCode, level1, level2, level3) {
    await send( ctx, `${packageCode}/assets/${level1}/${level2}/${level3}`, {root: config.get('pi_home')});
}));


packagesApp.use( router.get( '/packages', async function(ctx) {
    const packageDict = await cms.getAllLivePackageInfo();
    const userId = ctx.state.user ? ctx.state.user.id : null;

    if( userId) {
        await populateUserQueue(userId, packageDict);
    }

    const packageList = _.values(packageDict);
    
    const packageListHtml = ReactDOMServer.renderToString(
        <PackageSummaryList packageList={packageList} userId={userId} />
    );

    await ctx.render('packages', {packageList, packageListHtml}, {packageList, userId});
}));


packagesApp.use( router.post( '/@:author/:packageCode/add-to-queue', 
        async function(ctx, author, packageCode) {
    if( !ensureUser( ctx)) { return; }

    const pirep = cms.getLivePackageInfo( author, packageCode);

    if( !pirep) {
        ctx.status = 404;
        ctx.body = 'Package Not Found';
        return;
    }

    await models.addPackageToQueue( ctx.state.user.id, pirep.id);

    ctx.status = 200;
}));


packagesApp.use( router.post( '/@:author/:packageCode/remove-from-queue', 
        async function(ctx, author, packageCode) {
    if( !ensureUser( ctx)) { return; }

    const pirep = cms.getLivePackageInfo( author, packageCode);

    if( !pirep) {
        ctx.status = 404;
        ctx.body = 'Package Not Found';
        return;
    }

    await models.removePackageFromQueue( ctx.state.user.id, pirep.id);

    ctx.status = 200;
}));


packagesApp.use( router.get( '/@:author/:packageCode', async function( ctx, author, packageCode) {
    const p = cms.getLivePackage( author, packageCode);
    if( !p) {
        ctx.status = 404;
        return;
    }

    ctx.redirect(`/@${author}/${packageCode}/${p.topics[0].meta.code}`);
}));


packagesApp.use( router.get( '/@:author/:packageCode/:topicCode', 
        async function( ctx, author, packageCode, topicCode) {
    
    const userId = ctx.state.user ? ctx.state.user.id : null;
    const p = cms.getLivePackage( author, packageCode);
    if( !p) { ctx.status = 404; return; }

    let topicIndex = _.findIndex(p.topics, { meta: {code: topicCode}});
    if( topicIndex < 0) { ctx.status = 404; return; }
    
    const presentableTopic = makePresentableTopic(p, p.topics[topicIndex], userId);

    if( userId) {
        await addUserStateToTopic( p, presentableTopic, userId);
        await addUserStateToPackage(p, userId);
    }

    let nextTopic, prevTopic;
    if( topicIndex > 0) prevTopic = p.topics[topicIndex - 1];
    if( topicIndex < p.topics.length - 1) nextTopic = p.topics[topicIndex + 1];

    const topicHtml = ReactDOMServer.renderToString(
        <Topic p={p} topic={presentableTopic} userId={userId}/>
    );

    if( userId) markDoneTopicAsDone( userId, presentableTopic, p);

    await ctx.render( 'topic', {p, topic: presentableTopic, topicHtml, nextTopic, prevTopic}, 
        {p, topic: presentableTopic});
}));


packagesApp.use( router.get('/study-queue', async function( ctx) { 
    if( !ensureUser( ctx)) { return; }

    const packageList = await getQueuedPackages( ctx.state.user.id);
    const packageListHtml = ReactDOMServer.renderToString(
        <PackageSummaryList packageList={packageList} />
    );

    await ctx.render( 'study-queue', {packageList, packageListHtml}, {packageList});
}));


async function markDoneTopicAsDone( userId, topic, p) {
    const th = await models.getTopicHistory( userId, [topic.meta.compositeId]);
    if( th[topic.meta.compositeId]) {
        await markDonePackageAsDone( userId, p);
        return;
    }

    const compositeIds = getExerciseIds( topic);

    if( compositeIds.length) {
        const eh = await models.getExerciseHistory( userId, compositeIds);
        for( const compositeId of compositeIds) {
            if( !eh[compositeId]) {
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

    await models.savePackageHistory( userId, p.code);
}


packagesApp.use( router.post( '/exercise/:compositeId/solution', async function( ctx, compositeId) {
    if( !ensureUser( ctx)) { return; }

    const [author, packageCode, topicCode, ...rest] = compositeId.split('::');
    const exerciseId = rest.join('::');

    const p = await cms.getLivePackage( author, packageCode);
    if( !p) { ctx.status = 404; ctx.body = 'package not found.'; return; }

    const topic = _.find(p.topics, { meta: {code: topicCode}});
    if( !topic) { ctx.status = 404; ctx.body = 'topic not found.'; return; }

    const exercise = _.find(topic.sections, {id: exerciseId});
    if( !exercise) { ctx.status = 404; ctx.body = 'exercise not found.'; return; }

    if( exercise.type == 'multiple-choice-question') {
        const selectedIds = ctx.request.body.selectedIds || [];
        const correctIds = exercise.correctIds;
        const solutionIsCorrect = _.isEqual( selectedIds.sort(), correctIds.sort());
        if( solutionIsCorrect) {
            await models.saveExerciseHistory(ctx.state.user.id, compositeId, {selectedIds});
        }

        ctx.body = JSON.stringify({solutionIsCorrect, correctIds});
    } else if( exercise.type == 'coding-question') {
        const inSessionId = ctx.request.body.sessionId;
        const code = ctx.request.body.code;
        const executionId = ctx.request.body.executionId;
        const playgroundId = ctx.request.body.playgroundId;

        await models.savePlaygroundCode( ctx.state.user.id, playgroundId, code);

        const {sessionId, output, hasError, testResults} = await plutoid.executeCodeRequest( playgroundId, inSessionId, executionId, code, exercise.tests);

        let hasFailedTest = false;
        for( const test of testResults) {
            test.content = hljs.highlight( 'python', test.content, true).value;
            if( test.result != 'ok') { hasFailedTest = true; }
        }

        const solutionIsCorrect = !hasFailedTest && !hasError;
        if( solutionIsCorrect) {
            await models.saveExerciseHistory( ctx.state.user.id, compositeId, {code});
        }

        ctx.body = JSON.stringify({output, sessionId, testResults, hasError, solutionIsCorrect});
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
            await models.saveExerciseHistory( ctx.state.user.id, compositeId, {selectedCategories});
        }
        ctx.body = JSON.stringify({solutionIsCorrect, correctCategories});
    } else if( exercise.type == 'qualitative-question') {
        const answer = ctx.request.body.answer;

        await models.saveExerciseHistory( ctx.state.user.id, compositeId, {answer});

        ctx.body = JSON.stringify({});
    } else if( exercise.type == 'fill-in-the-blank-question') {
        const answers = ctx.request.body.answers;
        const corrections = {};

        let solutionIsCorrect = true;
        for( const blank of exercise.blanks) {
            const label = blank.label;
            const userAnswer = answers[label];

            if( !userAnswer || userAnswer.trim().toLowerCase() != blank.answer.toLowerCase()) {
                corrections[label] = blank.answer;
                solutionIsCorrect = false;
            }
        }

        if( solutionIsCorrect) {
            await models.saveExerciseHistory( ctx.state.user.id, compositeId, {answers});
        }

        ctx.body = JSON.stringify({solutionIsCorrect, corrections});
    }

    await markDoneTopicAsDone( ctx.state.user.id, topic, p);
}));



module.exports = {packagesApp};