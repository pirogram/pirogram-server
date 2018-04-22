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

function enrichTopic(p, topic, userId) {
    topic = _.cloneDeep(topic);

    topic.sections = topic.sections.map( (section, i) => {
        const compositeId = `${p.code}::${topic.meta.code}::${section.id}`;

        if( section.type == 'markdown') {
            return {type: 'html', html: section.html};
        } else if( section.type == 'multiple-choice-question') {
            return {
                type: section.type,
                question: section.questionHtml, options: section.options,
                compositeId,
                id: section.id, done: false, selectedIds: []
            };
        } else if( section.type == 'live-code') {
            return { type: section.type, id: section.id,
                compositeId,
                starterCode: section.code};
        } else if( section.type == 'coding-question') {
            return {
                type: section.type, id: section.id,
                compositeId, done: false,
                starterCode: section.code || '',
                problemStatement: section.questionHtml,
                referenceSolution: section.solutionHtml,
                tests: section.testsHtml
            }
        } else if( section.type == 'categorization-question') {
            const categories = section.categories;
            const challenges = _.keys( section.mappings);
            return {
                type: section.type, id: section.id,
                compositeId, done: false,
                question: section.questionHtml,
                categories, challenges
            }
        } else if( section.type == 'qualitative-question') {
            return {
                type: section.type, id: section.id, compositeId,
                done: false, question: section.questionHtml
            }
        } else if( section.type == 'fill-in-the-blank-question') {
            return {
                type: section.type, id: section.id, compositeId,
                done: false, question: section.questionHtml, starterCode: section.code,
                labels: _.keys(section.blanks)
            }
        } else {
            return {type: 'html', html: markdownToHtml(`Unsupported section type: ${section.type}`)};
        }
    });

    return topic;
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
        if( section.type == 'live-code' || section.type == 'fill-in-the-blank-question') { 
            compositeIds.push( section.compositeId);
        }
    });

    return compositeIds;
}

function hasExercises( topic) {
    return getExerciseIds(topic).length > 0;
}


async function addUserStateToTopic( p, topic, userId) {
    let compositeIds = getExerciseIds( topic);

    const ehobjs = await models.getExerciseHistory( userId, compositeIds);

    for( const section of topic.sections) {
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

    compositeIds = getPlaygroundIds( topic);
    const playgroundData = await models.getPlaygroundData( userId, compositeIds);

    topic.sections.map((section, index) => {
        if( playgroundData[ section.compositeId]) {
            section.userCode = playgroundData[ section.compositeId].code;
        }
    });
}


async function addUserStateToPackage( p, userId) {
    const topicIds = p.topics.map((topic, index) => {
        return topic.compositeId;
    });

    const thObjs = await models.getTopicHistory( userId, topicIds);
    p.topics.map( (topic, index) => {
        if( thObjs[topic.compositeId]) topic.state.done = true;
    });

    //if( await models.getSinglePackageHistory( userId, p.code)) { p.done = true; }
}


async function inferToc( p) {
    const topics = [];

    const files = await glob(`${config.get('pi_home')}/${p.code}/topics/*.md`);
    for( const file of files) {
        const topic = await loadTopic(p, file);
        if( topic) topics.push( topic);
    }

    return topics;
}


async function getPackageByCode( packageCode) {
    const packageDict = await getPackages();
    const p = packageDict[packageCode];

    if( !p) { return null; }

    p.topics = await inferToc(p);

    return p;
}


async function populateUserQueue( userId, packageDict) {
    const packageIds = await models.getQueuedPackages(userId);
    const packageList = [];
    for( const packageId of packageIds) {
        if( packageDict[packageId]) {
            packageDict[packageId].queued = true;
            packageList.push( packageDict[ packageId]);
        }
    }

    return packageList;
}


async function getQueuedPackages( userId) {
    const packageDict = await cms.getLivePackages();
    const packageList = await populateUserQueue( userId, packageDict);
    const packageIds = packageList.map( (p, index) => { return p.code; });

    const phObjs = await models.getPackageHistory( userId, packageIds);
    packageList.map( (p, index) => {
        if( phObjs[ p.code]) p.done = true;
    })
    
    return _.sortBy( packageList, [function(p) { return p.done ? 1 : 0; }]);
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
    if( !ensureUser( ctx)) { return; }

    const packageDict = await cms.getLivePackages();
    await populateUserQueue(ctx.state.user.id, packageDict);

    const packageList = _.values(packageDict);
    
    const packageListHtml = ReactDOMServer.renderToString(
        <PackageSummaryList packageList={packageList} />
    );

    await ctx.render('packages', {packageList, packageListHtml}, {packageList});
}));


packagesApp.use( router.post( '/@:author/:packageCode/add-to-queue', async function(ctx, author, packageCode) {
    if( !ensureUser( ctx)) { return; }

    const pirep = cms.getLivePackage( author, packageCode);

    if( !pirep) {
        ctx.status = 404;
        ctx.body = 'Package Not Found';
        return;
    }

    await models.addPackageToQueue( ctx.state.user.id, pirep.id);

    ctx.status = 200;
}));


packagesApp.use( router.post( '/@:author/:packageCode/remove-from-queue', async function(ctx, author, packageCode) {
    if( !ensureUser( ctx)) { return; }

    const pirep = cms.getLivePackage( author, packageCode);

    if( !pirep) {
        ctx.status = 404;
        ctx.body = 'Package Not Found';
        return;
    }

    await models.removePackageFromQueue( ctx.state.user.id, pirep.id);

    ctx.status = 200;
}));


packagesApp.use( router.get( '/@:author/:packageCode', async function( ctx, author, packageCode) {
    const pirep = cms.getLivePackage( author, packageCode);
    if( !pirep) {
        ctx.status = 404;
        return;
    }

    ctx.redirect(`/@${author}/${packageCode}/${pirep.getP().topics[0].meta.code}`);
}));


packagesApp.use( router.get( '/@:author/:packageCode/:topicCode', async function( ctx, author, packageCode, topicCode) {
    if( !ensureUser( ctx)) { return; }

    const pirep = cms.getLivePackage( author, packageCode);
    if( !pirep) { ctx.status = 404; return; }

    const p = _.cloneDeep(pirep.getP());

    let topic = _.find(p.topics, { meta: {code: topicCode}});
    if( !topic) { ctx.status = 404; return; }
    
    topic = enrichTopic(p, topic, ctx.state.user.id);
    await addUserStateToTopic( p, topic, ctx.state.user.id);
    await addUserStateToPackage(p, ctx.state.user.id);

    const topicHtml = ReactDOMServer.renderToString(
        <Topic p={p} topic={topic} userId={ctx.state.user.id}/>
    );

    markDoneTopicAsDone( ctx.state.user.id, topic, p);

    await ctx.render( 'topic', {pirep, p, topic, topicHtml}, {pirep, p, topic});
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
    const th = await models.getTopicHistory( userId, [topic.compositeId]);
    if( th[topic.compositeId]) return;

    const compositeIds = getExerciseIds( topic);

    if( compositeIds.length) {
        const eh = await models.getExerciseHistory( userId, compositeIds);
        for( const compositeId of compositeIds) {
            if( !eh[compositeId]) {
                return;
            }
        }
    }

    await models.saveTopicHistory( userId, topic.compositeId);
    await markDonePackageAsDone( userId, p);
}


async function markDonePackageAsDone( userId, p) {
    const topicIds = p.topics.map((topic, index) => {
        return topic.compositeId;
    });

    const thObjs = await models.getTopicHistory( userId, topicIds);
    if( _.keys( thObjs).length != topicIds.length) return;

    //if( await models.getSinglePackageHistory( userId, p.code)) return;

    //models.savePackageHistory( userId, p.code);
}


packagesApp.use( router.post( '/exercise/:compositeId/solution', async function( ctx, compositeId) {
    if( !ensureUser( ctx)) { return; }

    const [packageCode, topicCode, ...rest] = compositeId.split('::');
    const exerciseId = rest.join('::');

    const p = await getPackageByCode( packageCode);
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
        const tests = _.pull(exercise.tests.split(/\r?\n/), '');

        await models.savePlaygroundCode( ctx.state.user.id, playgroundId, code);

        const {sessionId, output, hasError, testResults} = await plutoid.executeCodeRequest( playgroundId, inSessionId, executionId, code, tests);

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