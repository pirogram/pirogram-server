'use strict;'
require('babel-register')({
    presets: ["es2015", "react", "stage-2"]
});
require('babel-polyfill');

const Koa = require('koa');
const router = require( 'koa-route');
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

import ModuleSummaryList from '../client/components/module-summary-list.jsx';
import Topic from '../client/components/topic.jsx';
const React = require('react');
const ReactDOMServer = require('react-dom/server');

const modulesApp = new Koa();

const moduleSchema = joi.object().keys({
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
            logger.emit('modules', {type: 'invalid-schema', path, err});
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
    const moduleDict = {};

    const files = await glob(config.get('pi_home') + '/*/package.yaml');
    
    for( const file of files) {
        const data = await loadYaml(file, moduleSchema);
        if( data) { 
            moduleDict[data.code] = data;
        }
    }

    return moduleDict;
}

const filenameRegex = /\/\d*-?([-\w]+)\.md$/;
async function loadTopic( m, file) {
    let data = null;
    try {
        data = await loadYamlAll(file);
    } catch( e) {
        logger.emit('cms', {type: 'yaml-parse-error', file, module: m.code, message: e.message});
        return null;
    }

    const topic = {meta: data[0], state: {done: false}, sections: data.slice(1)};
    
    topic.meta.title = topic.meta.title || '';
    if( !topic.meta.code) {
        const match = filenameRegex.exec(file);
        if( !match) {
            logger.emit('cms', {type: 'invalid-data', file, module: m.code, message: "missing code for topic."});
            return null;
        }
        topic.meta.code = match[1];
    }

    if( !topic.meta.id) {
        topic.meta.id = `${m.code}::${topic.meta.code}`;
    }

    topic.sections = _.filter( topic.sections, (o) => { return o != null;});

    topic.sections.map( (section, i) => {
        if( section.id) {
            section.id = section.id.toString();
            section.compositeId = `${m.code}::${topic.meta.code}::${section.id}`;
        }

        if( section.type == 'multiple-choice-question') {
            section.correctIds = [];
            section.options = section.options || [];
            section.options.map( (o, i) => {
                if( o.correct) { section.correctIds.push( i.toString()); }
            });
        }
    });

    return topic;
}

function enrichTopic(m, topic, userId) {
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
            section.type == 'qualitative-question') { 
            compositeIds.push( section.compositeId);
        }
    }

    return compositeIds;
}


function hasExercises( topic) {
    return getExerciseIds(topic).length > 0;
}


async function addUserStateToTopic( m, topic, userId) {
    const compositeIds = getExerciseIds( topic);

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
        }
    }
}


async function addUserStateToModule( m, userId) {
    const topicIds = m.topics.map((topic, index) => {
        return topic.meta.id;
    });

    const thObjs = await models.getTopicHistory( userId, topicIds);
    m.topics.map( (topic, index) => {
        if( thObjs[topic.meta.id]) topic.state.done = true;
    });
}


async function inferToc( m) {
    const topics = [];

    const files = await glob(`${config.get('pi_home')}/${m.code}/topics/*.md`);
    for( const file of files) {
        const topic = await loadTopic(m, file);
        if( topic) topics.push( topic);
    }

    return topics;
}


async function getModuleByCode( moduleCode) {
    const moduleDict = await getModules();
    const m = moduleDict[moduleCode];

    if( !m) { return null; }

    m.topics = await inferToc(m);

    return m;
}


async function getModuleList( moduleDict) {
    /*const moduleList = [];

    for( const code of config.get('module_list')) {
        moduleList.push(moduleDict[code]);
    }
    return moduleList;*/
    return _.values(moduleDict);
}


async function populateUserQueue( userId, moduleDict) {
    const moduleCodes = await models.getQueuedModules(userId);
    for( const moduleCode of moduleCodes) {
        if( moduleDict[moduleCode]) {
            moduleDict[moduleCode].queued = true;
        }
    }
}


async function getQueuedModules( userId) {
    const moduleDict = await getModules();
    await populateUserQueue( userId, moduleDict);

    const moduleList = [];
    for( const code of config.get('module_list')) {
        if( moduleDict[code].queued) {
            moduleList.push(moduleDict[code]);
        }
    }

    return moduleList;
}


modulesApp.use( router.get( '/modules', async function(ctx) {
    if( !ensureUser( ctx)) { return; }

    const moduleDict = await getModules();
    await populateUserQueue(ctx.state.user.id, moduleDict);

    const moduleList = await getModuleList(moduleDict);
    const moduleListHtml = ReactDOMServer.renderToString(
        <ModuleSummaryList moduleList={moduleList} />
    );

    await ctx.render('modules', {moduleList, moduleListHtml}, {moduleList});
}));


modulesApp.use( router.post( '/modules/:moduleCode/add-to-queue', async function(ctx, moduleCode) {
    if( !ensureUser( ctx)) { return; }

    const moduleDict = await getModules();
    if( !moduleDict[moduleCode]) {
        ctx.status = 404;
        ctx.body = 'Module Not Found';
        return;
    }

    await models.addModuleToQueue( ctx.state.user.id, moduleCode);

    ctx.status = 200;
}));


modulesApp.use( router.post( '/modules/:moduleCode/remove-from-queue', async function(ctx, moduleCode) {
    if( !ensureUser( ctx)) { return; }

    const moduleDict = await getModules();
    if( !moduleDict[moduleCode]) {
        ctx.status = 404;
        ctx.body = 'Module Not Found';
        return;
    }

    await models.removeModuleFromQueue( ctx.state.user.id, moduleCode);

    ctx.status = 200;
}));


modulesApp.use( router.get( '/modules/:moduleCode', async function( ctx, moduleCode) {
    const m = await getModuleByCode( moduleCode);
    if( !m) {
        ctx.status = 404;
        return;
    }

    ctx.redirect(`/modules/${moduleCode}/${m.topics[0].meta.code}`);
}));


modulesApp.use( router.get( '/modules/:moduleCode/:topicCode', async function( ctx, moduleCode, topicCode) {
    if( !ensureUser( ctx)) { return; }

    const m = await getModuleByCode( moduleCode);
    if( !m) { ctx.status = 404; return; }

    let topic = _.find(m.topics, { meta: {code: topicCode}});
    if( !topic) { ctx.status = 404; return; }
    
    topic = enrichTopic(m, topic, ctx.state.user.id);
    await addUserStateToTopic( m, topic, ctx.state.user.id);
    await addUserStateToModule(m, ctx.state.user.id);
    
    if( !hasExercises(topic)) {
        models.saveTopicHistory( ctx.state.user.id, topic.meta.id);
    }

    const topicHtml = ReactDOMServer.renderToString(
        <Topic m={m} topic={topic} userId={ctx.state.user.id}/>
    );

    markDoneTopicAsDone( ctx.state.user.id, topic);

    await ctx.render( 'topic', {m, topic, topicHtml}, {m, topic});
}));


modulesApp.use( router.get('/study-queue', async function( ctx) { 
    if( !ensureUser( ctx)) { return; }

    const moduleList = await getQueuedModules( ctx.state.user.id);
    const moduleListHtml = ReactDOMServer.renderToString(
        <ModuleSummaryList moduleList={moduleList} />
    );

    await ctx.render( 'study-queue', {moduleList, moduleListHtml}, {moduleList});
}));


async function markDoneTopicAsDone( userId, topic) {
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
}


modulesApp.use( router.post( '/exercise/:compositeId/solution', async function( ctx, compositeId) {
    if( !ensureUser( ctx)) { return; }

    const [moduleCode, topicCode, ...rest] = compositeId.split('::');
    const exerciseId = rest.join('::');

    const m = await getModuleByCode( moduleCode);
    if( !m) { ctx.status = 404; return; }

    const topic = _.find(m.topics, { meta: {code: topicCode}});
    if( !topic) { ctx.status = 404; return; }

    const exercise = _.find(topic.sections, {id: exerciseId});
    if( !exercise) { ctx.status = 404; return; }

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

        const {sessionId, output, hasError, testResults} = await plutoid.executeCodeRequest( inSessionId, executionId, code, tests);

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
    }

    await markDoneTopicAsDone( ctx.state.user.id, topic);
}));

module.exports = {modulesApp};