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
const yaml = require('js-yaml');
const joi = require('joi');
const _ = require('lodash');
const hljs = require('highlight.js');
const models = require( '../models');
const {logger} = require('../lib/logger');
const plutoid = require('../lib/plutoid');
import {ensureUser, glob, markdownToHtml} from '../lib/util';

import ModuleSummaryList from '../client/components/package-summary-list.jsx';
import Topic from '../client/components/topic.jsx';
const React = require('react');
const ReactDOMServer = require('react-dom/server');

const packagesApp = new Koa();

const packageSchema = joi.object().keys({
    code: joi.string().alphanum().min(3).max(256).required(),
    title: joi.string().required(),
    description: joi.string().required(),
    author_name: joi.string(),
    author_url: joi.string()
});

async function loadYaml( path, schema) {
    const content = await new Promise((resolve, reject) => {
        fs.readFile(path, (err, data) => {
            if(err) { reject(err); }
            else { resolve(data); }
        });
    });

    const data = yaml.safeLoad( content);

    if( schema) {
        const {err, value} = joi.validate( data, schema);

        if( err) {
            logger.emit('packages', {type: 'invalid-schema', path, err});
            return null;
        }
    }

    return data;    
}


async function loadYamlAll( path) {
    const content = await new Promise((resolve, reject) => {
        fs.readFile(path, (err, data) => {
            if(err) { reject(err); }
            else { resolve(data); }
        });
    });

    return yaml.safeLoadAll( content, null, {disableAlias: true});
}


async function getModules() {
    const packageDict = {};

    const files = await glob(config.get('pi_home') + '/*/package.yaml');
    
    for( const file of files) {
        const data = await loadYaml(file, packageSchema);
        if( data) { 
            packageDict[data.code] = data;
        }
    }

    return packageDict;
}

const filenameRegex = /\/\d*-?([-\w]+)\.md$/;
async function loadTopic( p, file) {
    let data = null;
    try {
        data = await loadYamlAll(file);
    } catch( e) {
        logger.emit('cms', {type: 'yaml-parse-error', file, package: p.code, message: e.message});
        return null;
    }

    const topic = {meta: data[0], state: {done: false}, sections: data.slice(1)};
    
    topic.meta.title = topic.meta.title || '';
    if( !topic.meta.code) {
        const match = filenameRegex.exec(file);
        if( !match) {
            logger.emit('cms', {type: 'invalid-data', file, package: p.code, message: "missing code for topic."});
            return null;
        }
        topic.meta.code = match[1];
    }

    if( !topic.meta.id) {
        topic.meta.id = `${p.code}::${topic.meta.code}`;
    }

    topic.sections = _.filter( topic.sections, (o) => { return o != null;});

    topic.sections.map( (section, i) => {
        if( section.id) {
            section.id = section.id.toString();
            section.compositeId = `${p.code}::${topic.meta.code}::${section.id}`;
        }

        if( section.type == 'multiple-choice-question') {
            section.correctIds = [];
            section.options = section.options || [];
            section.options.map( (o, i) => {
                if( o.correct) { section.correctIds.push( i.toString()); }
            });
        } else if( section.type == 'fill-in-the-blank-question') {
            section.blanks.map( (blank, index) => {
                blank.answer = blank.answer + "";
            });
        }
    });

    return topic;
}

function enrichTopic(p, topic, userId) {
    topic = _.cloneDeep(topic);

    topic.sections = topic.sections.map( (section, i) => {
        if( typeof( section) == "string") {
            return {type: 'html', html: markdownToHtml(section)};
        } else if( section.type == 'multiple-choice-question') {
            const choiceOptions = section.options.map( (o, i) => {
                return {id: i.toString(), html: markdownToHtml( o.text)};
            });

            return {
                type: section.type,
                question: markdownToHtml(section.question), choiceOptions,
                compositeId: section.compositeId,
                id: section.id, done: false, selectedIds: []
            };
        } else if( section.type == 'live-code') {
            return { type: section.type, id: section.id,
                compositeId: section.compositeId, starterCode: section.code};
        } else if( section.type == 'coding-question') {
            const tests = section.tests ? _.pull(section.tests.split(/\r?\n/), '') : [];
            return {
                type: section.type, id: section.id,
                compositeId: section.compositeId, done: false,
                starterCode: section.code || '',
                problemStatement: markdownToHtml(section.question),
                referenceSolution: section.solution ? hljs.highlight( 'python', section.solution, true).value : null,
                tests: tests.map((test, i) => {
                        return {content: hljs.highlight( 'python', test, true).value};
                    })
            }
        } else if( section.type == 'categorization-question') {
            const categories = section.categories || _.sortedUniq( _.values(section.mappings).sort());
            const challenges = _.keys( section.mappings);
            return {
                type: section.type, id: section.id,
                compositeId: section.compositeId, done: false,
                question: markdownToHtml(section.question),
                categories, challenges
            }
        } else if( section.type == 'qualitative-question') {
            return {
                type: section.type, id: section.id, compositeId: section.compositeId,
                done: false, question: markdownToHtml(section.question)
            }
        } else if( section.type == 'fill-in-the-blank-question') {
            return {
                type: section.type, id: section.id, compositeId: section.compositeId,
                done: false, question: markdownToHtml(section.question), starterCode: section.code,
                labels: section.blanks.map((blank, index) => { return blank.label; })
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


async function addUserStateToModule( p, userId) {
    const topicIds = p.topics.map((topic, index) => {
        return topic.meta.id;
    });

    const thObjs = await models.getTopicHistory( userId, topicIds);
    p.topics.map( (topic, index) => {
        if( thObjs[topic.meta.id]) topic.state.done = true;
    });

    if( await models.getSinglePackageHistory( userId, p.code)) { p.done = true; }
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


async function getModuleByCode( packageCode) {
    const packageDict = await getModules();
    const p = packageDict[packageCode];

    if( !p) { return null; }

    p.topics = await inferToc(p);

    return p;
}


async function getModuleList( packageDict) {
    /*const packageList = [];

    for( const code of config.get('package_list')) {
        packageList.push(packageDict[code]);
    }
    return packageList;*/
    return _.values(packageDict);
}


async function populateUserQueue( userId, packageDict) {
    const packageCodes = await models.getQueuedModules(userId);
    const packageList = [];
    for( const packageCode of packageCodes) {
        if( packageDict[packageCode]) {
            packageDict[packageCode].queued = true;
            packageList.push( packageDict[ packageCode]);
        }
    }

    return packageList;
}


async function getQueuedModules( userId) {
    const packageDict = await getModules();
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

    const packageDict = await getModules();
    await populateUserQueue(ctx.state.user.id, packageDict);

    const packageList = await getModuleList(packageDict);
    
    const packageListHtml = ReactDOMServer.renderToString(
        <ModuleSummaryList packageList={packageList} />
    );

    await ctx.render('packages', {packageList, packageListHtml}, {packageList});
}));


packagesApp.use( router.post( '/packages/:packageCode/add-to-queue', async function(ctx, packageCode) {
    if( !ensureUser( ctx)) { return; }

    const packageDict = await getModules();
    if( !packageDict[packageCode]) {
        ctx.status = 404;
        ctx.body = 'Module Not Found';
        return;
    }

    await models.addModuleToQueue( ctx.state.user.id, packageCode);

    ctx.status = 200;
}));


packagesApp.use( router.post( '/packages/:packageCode/remove-from-queue', async function(ctx, packageCode) {
    if( !ensureUser( ctx)) { return; }

    const packageDict = await getModules();
    if( !packageDict[packageCode]) {
        ctx.status = 404;
        ctx.body = 'Module Not Found';
        return;
    }

    await models.removeModuleFromQueue( ctx.state.user.id, packageCode);

    ctx.status = 200;
}));


packagesApp.use( router.get( '/packages/:packageCode', async function( ctx, packageCode) {
    const p = await getModuleByCode( packageCode);
    if( !p) {
        ctx.status = 404;
        return;
    }

    ctx.redirect(`/packages/${packageCode}/${p.topics[0].meta.code}`);
}));


packagesApp.use( router.get( '/packages/:packageCode/:topicCode', async function( ctx, packageCode, topicCode) {
    if( !ensureUser( ctx)) { return; }

    const p = await getModuleByCode( packageCode);
    if( !p) { ctx.status = 404; return; }

    let topic = _.find(p.topics, { meta: {code: topicCode}});
    if( !topic) { ctx.status = 404; return; }
    
    topic = enrichTopic(p, topic, ctx.state.user.id);
    await addUserStateToTopic( p, topic, ctx.state.user.id);
    await addUserStateToModule(p, ctx.state.user.id);

    const topicHtml = ReactDOMServer.renderToString(
        <Topic p={p} topic={topic} userId={ctx.state.user.id}/>
    );

    markDoneTopicAsDone( ctx.state.user.id, topic, p);

    await ctx.render( 'topic', {p, topic, topicHtml}, {p, topic});
}));


packagesApp.use( router.get('/study-queue', async function( ctx) { 
    if( !ensureUser( ctx)) { return; }

    const packageList = await getQueuedModules( ctx.state.user.id);
    const packageListHtml = ReactDOMServer.renderToString(
        <ModuleSummaryList packageList={packageList} />
    );

    await ctx.render( 'study-queue', {packageList, packageListHtml}, {packageList});
}));


async function markDoneTopicAsDone( userId, topic, p) {
    const th = await models.getTopicHistory( userId, [topic.meta.id]);
    if( th[topic.meta.id]) return;

    const compositeIds = getExerciseIds( topic);

    if( compositeIds.length) {
        const eh = await models.getExerciseHistory( userId, compositeIds);
        for( const compositeId of compositeIds) {
            if( !eh[compositeId]) {
                return;
            }
        }
    }

    await models.saveTopicHistory( userId, topic.meta.id);
    await markDonePackageAsDone( userId, p);
}


async function markDonePackageAsDone( userId, p) {
    const topicIds = p.topics.map((topic, index) => {
        return topic.meta.id;
    });

    const thObjs = await models.getTopicHistory( userId, topicIds);
    if( _.keys( thObjs).length != topicIds.length) return;

    if( await models.getSinglePackageHistory( userId, p.code)) return;

    models.savePackageHistory( userId, p.code);
}


packagesApp.use( router.post( '/exercise/:compositeId/solution', async function( ctx, compositeId) {
    if( !ensureUser( ctx)) { return; }

    const [packageCode, topicCode, ...rest] = compositeId.split('::');
    const exerciseId = rest.join('::');

    const p = await getModuleByCode( packageCode);
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