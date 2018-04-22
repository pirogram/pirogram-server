'use strict';

const Package = require('pirogram-package-loader');
const {glob} = require('./util');
const {logger} = require('./logger');
const config = require('config');
const path = require('path');
const _ = require('lodash');
const fs = require('fs');

let _pirepPackages = {};
let _packages = {};

class PirogramPackage {
    constructor( p, author, dirPath) {
        this.code = p.code; this.description = p.description; this.title = p.title;
        this.author = author; this.dirPath = dirPath;
        this.id = `${this.author}::${this.code}`;
        
        p.topics.map((topic, i) => {
            topic.compositeId = `${this.id}::${topic.meta.id}`;
            topic.sections.map( (section, j) => {
                if( section.id) { 
                    section.compositeId = `${topic.compositeId}::${section.id}`;
                }
            });
        });

        _packages[ this.id] = p;
        _pirepPackages[ this.id] = this;
    }

    getP() { return _packages[this.id]; }

    static getPirogramPackageById( id) { return _pirepPackages[ id]; }
    static getPirogramPackage( author, packageCode) { return _pirepPackages[ `${author}::${packageCode}`]; }

    static getPackageById( id) { return _packages[ id]; }
    static getPackage( author, packageCode) { return _packages[ `${author}::${packageCode}`]; }
}

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
        const p = await Package.loadFromDir( dirPath);
        const author = path.basename( path.dirname( path.resolve( dirPath)));

        logger.emit('cms', {event: 'loaded-package', dirPath});
        return new PirogramPackage( p, author, dirPath);
    } catch( e) {
        logger.emit('package-load-failure', {error: true, dirPath, name: e.name, message: e.message});
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
    const livePath = path.resolve( path.join( config.get('pi_home'), 'live'));
    fs.watch(livePath, {recursive: true}, async function( e, filename) {
        const relativePathComponents = path.resolve( filename).split( livePath)[1].split('/');
        if( relativePathComponents.length < 3) return;

        const author = relativePathComponents[1];
        const packageCode = relativePathComponents[2];
        await reloadPackage( author, packageCode);
    });
}


export function getLivePackage( author, packageCode) {
    return _.cloneDeep( PirogramPackage.getPirogramPackage( author, packageCode));
}

export function getLivePackages() {
    return _.cloneDeep( _pirepPackages);
}

loadLivePackages();