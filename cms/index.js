'use strict';

import {Module} from './modules';
import {Topic} from './topic';
const config = require('config');
const fs = require('fs-extra');
const subprocess = require('../lib/subprocess');
const path = require('path');
const _ = require('lodash');
const uuid = require('uuid');

const ROOTDIR = config.get( 'cms.rootdir')
const LIVEDIR = path.resolve( ROOTDIR, config.get('cms.livedir'));


class ModuleExistsError extends Error {}


function getLiveModuleDir( id) {
    return path.resolve(LIVEDIR, id);
}


function getStageModuleDir( id, stageName) {
    return path.resolve( getStageDir( stageName), id);
}


function getStageDir( stageName) {
    return path.resolve( ROOTDIR, stageName);
}


export async function createModule( slug, name) {
    const liveModuleDir = getLiveModuleDir( slug);
    const exists = await fs.exists( liveModuleDir);
    if( exists) {
        throw new ModuleExistsError('Directory by name ' + slug + ' already exists');
    }

    const m = new Module();
    Object.assign( m, {id: uuid.v4(), slug, name, 
        topics: [{id: uuid.v4(), filename: 'introduction.smd', slug: 'introduction', name: 'Introduction', tocName: 'Introduction', level: 1}]});

    await fs.ensureDir( liveModuleDir);
    await fs.writeJSON( liveModuleDir + '/' + 'module.json', {name: m.name, slug: m.slug, topics: m.topics}, {spaces:4});

    await subprocess.exec( './sh-scripts/create-module.sh', ['--module-dir', liveModuleDir]);

    return m;
}


export async function getAllModules( stageName = null) {
    if( stageName) {
        await ensureStage( stageName);
    }

    const dir = stageName ? getStageDir( stageName) : LIVEDIR;
    const moduleDirList = await fs.readdir( dir);
    const moduleList = [];
    for( const moduleDir of moduleDirList) {
        const m = await getModuleFromDir( path.resolve( dir, moduleDir));
        if( m) {
            moduleList.push( m);
        }
    }

    return moduleList;
}


export async function getModuleFromDir( moduleDir) {
    const moduleJsonPath = path.resolve( moduleDir, 'module.json');
    if( !await fs.pathExists( moduleJsonPath)) { return null; }

    const data = await fs.readJSON( moduleJsonPath);
    const m = new Module();
    return Object.assign( m, {id: data.id, slug: data.slug, name: data.name, topics: data.topics});
}


export async function getModuleBySlug( slug, stageName=null) {
    if( stageName) {
        await ensureModuleStage( slug, stageName);
    }

    const moduleList = await getAllModules( stageName);
    for( const m of moduleList) {
        if( m.slug == slug) return m;
    }

    return null;
}


export async function getTopicBySlug( m, topicSlug, stageName=null) {
    const topicData = _.find(m.topics, {slug: topicSlug});
    if( !topicData) return null;

    let dir = stageName ? getStageModuleDir( m.slug, stageName) : getLiveModuleDir( m.slug);
    const filePath = path.resolve( dir, topicData.filename);
    const topic = new Topic();

    try {
        const rawContent = await fs.readFile( filePath, 'utf8');
        Object.assign( topic, {slug: topicSlug, id: topicData.id, name: topicData.name, tocName: topicData.tocName, rawContent});
    } catch(e) {
        return null;
    }

    return topic;
}


export async function hasStage( moduleSlug, stageName) {
    const stageModuleDir = getStageModuleDir( moduleSlug, stageName);
    try {
        await fs.access( stageModuleDir, fs.constants.F_OK);
        return true;
    } catch( e) {
        return false;
    }
}


async function ensureStage( stageName) {
    await fs.ensureDir( getStageDir( stageName));
}


async function ensureModuleStage( moduleSlug, stageName) {
    if( await hasStage( moduleSlug, stageName)) return;

    const stageDir = getStageDir( stageName);
    await fs.ensureDir( stageDir);

    await subprocess.exec( './sh-scripts/create-module-stage.sh', 
        ['--stage-dir', stageDir, '--live-module-dir', getLiveModuleDir( moduleSlug)]);
}


// export async function createOrUpdateTopic( m, stageName, topic) {
//     /* ensure that the stage exists. */
//     await ensureModuleStage( m.slug, stageName);
// 
//     /* write the topic file in stage. */
//     const stageModuleDir = getStageModuleDir( m.slug, stageName);
//     const topicFileName = topic.slug + ".smd"
//     const topicPath = path.resolve( stageModuleDir, topicFileName);
//     await fs.writeFile( topicPath, topic.rawContent);
// 
//     /* update module.json */
//     const moduleData = await fs.readJSON( path.resolve( stageModuleDir, 'module.json'));
//     const moduleTopics = moduleData['topics'] || [];
//     let moduleTopic = _.find( moduleTopics, {slug: topic.id});
//     if( moduleTopic) {
//         moduleTopic = Object.assign( moduleTopic, {slug: topic.slug, name: topic.name, tocName: topic.tocName});
//     } else {
//         moduleTopic = {slug: topic.slug, name: topic.name, tocName: topic.tocName};
//         moduleTopics.push( moduleTopic);
//     }
//     await fs.writeJSON( path.resolve( stageModuleDir, "module.json"), moduleData);
// 
//     /* commit changes */
//     await subprocess.exec( './sh-scripts/commit-topic.sh', 
//         ['--stage-module-dir', stageModuleDir, '--topic-file-name', topicFileName]);
// }


export async function updateToC( m, updatedTopics, stageName) {
    await ensureModuleStage( m.slug, stageName);
    const stageModuleDir = getStageModuleDir( m.slug, stageName);
    const moduleJsonPath = path.resolve( stageModuleDir, 'module.json');
    const moduleData = await fs.readJSON( moduleJsonPath);
    moduleData.topics = updatedTopics;
    await fs.writeJSON( moduleJsonPath, moduleData, {spaces: 4});

    await subprocess.exec( './sh-scripts/commit-module-json.sh', 
        ['--stage-module-dir', stageModuleDir]);
}


export async function updateTopic( m, topicSlug, stageName, newName, newTocName, newSlug, newRawContent) {
    await ensureModuleStage( m.slug, stageName);

    const stageModuleDir = getStageModuleDir( m.slug, stageName);
    const topicFileName = newSlug + ".smd"
    const topicPath = path.resolve( stageModuleDir, topicFileName);
    await fs.writeFile( topicPath, newRawContent);

    const moduleData = await fs.readJSON( path.resolve( stageModuleDir, 'module.json'));
    let topicData = _.find( moduleData.topics, {slug: topicSlug});
    if( topicData) {
        topicData = Object.assign( topicData, {slug: newSlug, name: newName, tocName: newTocName, filename: topicFileName});
    } else {
        topicData = {id: uuid.v4(), filename: topicFileName, slug: newSlug, name: newName, tocName: newTocName};
        moduleTopics.push( topicData);
    }
    await fs.writeJSON( path.resolve( stageModuleDir, "module.json"), moduleData, {spaces: 4});

    const args = ['--stage-module-dir', stageModuleDir, '--topic-file-name', topicFileName];
    if( newSlug != topicSlug) {
        args.push( '--old-topic-file-name');
        args.push( topicSlug + '.smd');
    }
    console.log( args);
    await subprocess.exec( './sh-scripts/commit-topic.sh', args);
}


export async function publishStage( moduleSlug, stageName) {
    if( !hasStage( moduleSlug, stageName)) return;

    const stageModuleDir = getStageModuleDir( moduleSlug, stageName);

    await subprocess.exec( './sh-scripts/publish-stage.sh', 
        ['--stage-module-dir', stageModuleDir, '--live-module-dir', getLiveModuleDir( moduleSlug)]);
}


export async function discardStage( m, stageName) {
    if( !hasStage( m.slug, stageName)) return;

    const stageModuleDir = getStageModuleDir( m.slug, stageName);
    await fs.rmdir( stageModuleDir);
}


export {Module, Topic};


/*
Create Module:
m = await cms.createModule(slug, name);

Create Topic:
t = await cms.createTopic( m, stageName, rawContent);

Update Topic:
t = m.updateTopic(stageName, topicSlug, rawContent);

Fetch Topic:
t = await m.fetchTopic( stageName, topicSlug);

Delete Topic:
await m.deleteTopic( stageName, topicSlug);

Get list of all topics:
tList = await m.getTopicList( stageName);

Delete Module:
m.delete();

Update Module:
m.update(stageName, slug, name);

Update ToC:
m.updateToC(stageName, toc);

Check if publishing required:
m.hasStagedChanges(stageName);

Publish changes:
m.publishStagedChanges(stageName);

Discard changes:
m.discardStagedChanges(stageName);

Get Exercise By Id:
Module.getExerciseById(moduleSlug, topicSlug, exerciseId, stageName=null);

*/