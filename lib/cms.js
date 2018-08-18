'use strict';

const pirepLoader = require('prep-loader');
const {glob, loadFileContent} = require('./util');
const {logger} = require('./logger');
const config = require('config');
const path = require('path');
const _ = require('lodash');
const watch = require('node-watch');
const yaml = require('js-yaml');

let _packages = {};
let _packageDisplayList = [];
let _sections = {};

async function getLivePackagePathList() {
    const files = await glob(path.join( config.get('pi_home'), 'live', 'packages', '*', 'package.yaml'));
    return files.map( (file, index) => {
        return path.dirname( file);
    });
}


export function isExercise(section) {
    if( section.type == 'multiple-choice-question' ||
        section.type == 'coding-question' ||
        section.type == 'categorization-question' ||
        section.type == 'qualitative-question' ||
        section.type == 'fill-in-the-blank-question' ||
        section.type == 'testless-coding-question') { 
            return true;
    }

    return false;
}

export function canHaveCodePlayground(section) {
    if( isExercise(section) || section.type == 'live-code') {
        return true;
    }

    return false;
}


export function getSectionLineageById( sectionId) {
    const [p, topic, section] = _sections[ sectionId];

    const pClone = _.cloneDeep( p);
    const topicClone = _.find( p.topics, {meta: {code: topic.meta.code}});
    const sectionClone = _.find( topicClone.sections, {id: sectionId});

    return [pClone, topicClone, sectionClone];
}


async function loadPackage( dirPath) {
    try {
        const p = await pirepLoader.loadPackage( dirPath);
        const sections = {};
        p.topics.map((topic, i) => {
            topic.meta.compositeId = `${p.meta.code}::${topic.meta.id}`;
            topic.sections.map( (section, j) => {
                if( section.id) { 
                    sections[section.id] = [p, topic, section];
                }
            });
        });

        /* remove old exercises ids. */
        const currP = _packages[p.meta.code];
        if( currP) {
            currP.topics.map((topic, i) => {
                topic.sections.map( (section, j) => {
                    if( section.id) {
                        delete( _sections[section.id]);
                    }
                });
            });
        }

        /* install new exercise ids .*/
        Object.assign( _sections, sections);

        _packages[p.meta.code] = p;

        logger.emit('cms', {event: 'loaded-package', dirPath});

        return p;
    } catch( e) {
        const message = e.message || e;
        logger.emit('cms', {event: 'package-load-failure', error: true, dirPath, name: e.name, 
            message, stack: e.stack});
        return null;
    }
}

async function loadPackages( dirList) {
    const packageList = dirList.map( async (dir, index) => {
        return await loadPackage( dir);
    });

    return _.pull( packageList, null);
}

async function loadLivePackages() {
    await loadPackages( await getLivePackagePathList());
}

function watchLivePackages() {
    const pendingDirPath = {};
    const livePath = path.resolve( path.join( config.get('pi_home'), 'live'));


    watch(livePath, {recursive: true}, async function( e, filename) {
        logger.emit( 'cms', { event: 'path-changed', filename});
        const relativePathComponents = path.resolve( filename).split( livePath)[1].split('/');
        if( relativePathComponents.length < 2) return;

        const metaOrPackage = relativePathComponents[1];
        const packageCode = relativePathComponents[2];
        if( metaOrPackage == 'meta') {
            loadMeta();
        } else {
            const dirPath = path.join( livePath, 'packages', packageCode);

            if( pendingDirPath[ dirPath]) return;
            pendingDirPath[ dirPath] = 1;

            setTimeout( async () => {
                delete( pendingDirPath[ dirPath]);
                await loadPackage( dirPath);
            }, 2000);
        }
    });

    logger.emit( 'cms', { event: 'watching-live-packages'});
}


export function getLivePackage( packageCode) {
    const p = _packages[ packageCode];
    if( !p) return p;
    return _.cloneDeep( p);
}


export function getAllLivePackageSummary() {
    const allInfo = {};
    _.keys( _packages).map( (key, index) => {
        const p = _packages[key];
        const pSummary = {
            meta: _.cloneDeep( p.meta), 
            topics: p.topics.map((topic, i) => {
                return { meta: _.cloneDeep( topic.meta) };
            })
        }
        
        allInfo[ key] = pSummary;
    });

    return allInfo;
}


function fillPackageDisplayMeta( packageDisplay) {
    const p = _packages[ packageDisplay.code];
    if( p) packageDisplay.meta = _.cloneDeep(p.meta);

    if( packageDisplay.packages) {
        packageDisplay.packages.map( (packageDisplay, i) => {
            fillPackageDisplayMeta( packageDisplay);
        });
    }
}


export function getPackageDisplayList() {
    const packageDisplayList = _.cloneDeep( _packageDisplayList);
    packageDisplayList.map( (packageDisplay, i) => {
        fillPackageDisplayMeta( packageDisplay);
    });

    return packageDisplayList;
}


async function loadMeta() {
    let content = null;
    try {
        content = await loadFileContent( path.join( config.get('pi_home'), 'live', 'meta', 'meta.yaml'));
    } catch(e) {
        logger.emit('cms', {event: 'meta-load-error', e});
    }

    let data = null;
    try {
        data = yaml.safeLoad( content);
    } catch(e) {
        logger.emit('cms', {event: 'meta-load-error', e});
    }

    _packageDisplayList = data['packages'] || [];
}


loadMeta();
loadLivePackages();
watchLivePackages();