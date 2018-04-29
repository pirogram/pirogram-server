'use strict';

const pirepLoader = require('pirogram-package-loader');
const {glob} = require('./util');
const {logger} = require('./logger');
const config = require('config');
const path = require('path');
const _ = require('lodash');
const fs = require('fs');

let _packages = {};

async function getLivePackagePathList() {
    const files = await glob(path.join( config.get('pi_home'), 'live', '*', '*', 'package.yaml'));
    return files.map( (file, index) => {
        return path.dirname( file);
    });
}

async function getDraftPackagePathList() {
    const files = await glob(config.get('pi_home') + '/draft/*/*/package.yaml');
    return files.map( (file, index) => {
        return path.dirname( file);
    });
}

async function loadPackage( dirPath) {
    try {
        const author = path.basename( path.dirname( path.resolve( dirPath)));

        const p = await pirepLoader.loadPackage( author, dirPath);
        p.meta.compositeId = getPackageCompositeId( p.meta.author, p.meta.code);

        p.topics.map((topic, i) => {
            topic.meta.compositeId = `${p.meta.compositeId}::${topic.meta.id}`;
            topic.sections.map( (section, j) => {
                if( section.id) { 
                    section.compositeId = `${topic.meta.compositeId}::${section.id}`;
                }
            });
        });

        _packages[p.meta.compositeId] = p;

        logger.emit('cms', {event: 'loaded-package', dirPath});

        return p;
    } catch( e) {
        const message = e.message || e;
        logger.emit('package-load-failure', {error: true, dirPath, name: e.name, message, stack: e.stack});
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

function getPackageCompositeId( author, packageCode) {
    return `${author}::${packageCode}`
}

/*
function watchLivePackages() {
    const livePath = path.resolve( path.join( config.get('pi_home'), 'live'));
    fs.watch(livePath, {recursive: true}, async function( e, filename) {
        const relativePathComponents = path.resolve( filename).split( livePath)[1].split('/');
        if( relativePathComponents.length < 3) return;

        const author = relativePathComponents[1];
        const packageCode = relativePathComponents[2];
        await reloadPackage( author, packageCode);
    });
}*/


export function getLivePackage( author, packageCode) {
    const p = _packages[ getPackageCompositeId( author, packageCode)];
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

loadLivePackages();