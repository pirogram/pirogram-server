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
let _books = [];
let _authors = [];

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
    if( !_sections[sectionId]) {
        return [null, null, null];
    }
    
    const [book, p, topic, section] = _sections[ sectionId];

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
        });

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
    for( const dir of dirList) {
        await loadPackage(dir);
    }
}

async function loadLivePackages() {
    await loadPackages( await getLivePackagePathList());
    linkBookAndPackages();
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
            linkBookAndPackages();
        } else {
            const dirPath = path.join( livePath, 'packages', packageCode);

            if( pendingDirPath[ dirPath]) return;
            pendingDirPath[ dirPath] = 1;

            setTimeout( async () => {
                delete( pendingDirPath[ dirPath]);
                await loadPackage( dirPath);
                linkBookAndPackages();
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


function linkBookAndPackages() {
    _sections = {};
    _books.map( (book, _) => {
        book.packages = [];
        book.packageCodes.map( (packageCode, i) => {
            const p = _packages[packageCode];
            if( !p) return;

            book.packages.push(p);
            p.meta.index = (i + 1) + "";
            p.book = {code: book.code, title: book.title};

            p.topics.map( (topic, j) => {
                topic.meta.index = `${p.meta.index}.${j+1}`;
                let exerciseIndex = 1;
                topic.sections.map( (section, k) => {
                    if(isExercise(section)) {
                        section.meta = {
                            index: `${topic.meta.index}.${exerciseIndex}`, 
                            topicCode: topic.meta.code,
                            packageCode: p.meta.code,
                            bookCode: book.code
                        };

                        exerciseIndex +=1 ;
                    }
                    _sections[section.id] = [book, p, topic, section];
                });
            });
        });
    });
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


export function getBooksList() {
    const books = _.cloneDeep( _books);
    books.map( (book, i) => {
        book.packages.map( (pSummary, j) => {
            if( _packages[pSummary.code]) {
                const p = _packages[pSummary.code];
                pSummary.meta = _.cloneDeep(p.meta);
            }
        });
    });
    return books;
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
    _books = data['books'] || [];
    _authors = data['authors'] || [];

    _books.map( (book, i) => {
        book.author = _.find(_authors, {code: book.author});
        book.packages = [];
    });
    
    linkBookAndPackages();
}

loadMeta();
loadLivePackages();
watchLivePackages();