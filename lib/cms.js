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
let _sections = {};
let _books = [];
let _pendingBooksLoad = false;

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
        if( p.meta.status == 'draft') return null;
        
        p.meta.dirname = path.basename(dirPath);
        p.topics.map((topic, i) => {
            topic.meta.compositeId = `${p.meta.code}::${topic.meta.id}`;
        });

        logger.emit('cms', {event: 'loaded-package', dirPath});

        return p;
    } catch( e) {
        const message = e.message || e;
        logger.emit('cms', {event: 'package-load-failure', error: true, dirPath, name: e.name, 
            message, stack: e.stack});
        return null;
    }
}


function watchBooks() {
    const booksPath = path.resolve( path.join( config.get('pi_home'), 'books'));


    watch(booksPath, {recursive: true}, async function( e, filename) {
        logger.emit( 'cms', { event: 'path-changed', filename});
        if( _pendingBooksLoad) return;

        _pendingBooksLoad = true;
        setTimeout( async () => {
            _pendingBooksLoad = false;
            await loadBooks();
        }, 2000);
    });

    logger.emit( 'cms', { event: 'watching-books'});
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


export function getBookByCode( bookCode) {
    if( !_books[bookCode]) return null;

    return _.cloneDeep( _books[bookCode]);
}


export function getBookWithoutSections( bookCode) {
    const book = _.find( _books, {code: bookCode});
    if( !book) return null;

    return _.cloneDeepWith( book, (value, key) => {
        return key == 'sections' ? [] : undefined;
    });
}


async function loadBook(book, bookdir) {
    const packageYamls = await glob(path.join( bookdir, '*', 'package.yaml'));
    const packageDirs = packageYamls.map( (file, index) => {
        return path.dirname( file);
    });

    book.packages = [];
    let packageIndex = 0;
    for( const packageDir of packageDirs) {
        const p = await loadPackage(packageDir);
        if(!p) continue;
        
        book.packages.push(p);
        p.meta.index = (packageIndex + 1) + "";
        p.book = {code: book.code, title: book.title};
        packageIndex += 1;

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
            });
        });
    }
}


async function loadBooks() {
    const books = [];
    const packages = {};
    const sections = {};

    const bookdirs = await glob( path.join( config.get('pi_home'), 'books', '*'));

    for( const bookdir of bookdirs) {
        let content = null;
        try {
            content = await loadFileContent( path.join(bookdir, 'meta.yaml'));
        } catch(e) {
            continue;
        }

        let data = null;
        try {
            data = yaml.safeLoad( content);
        } catch(e) {
            logger.emit('cms', {event: 'meta-load-error', e});
        }

        const book = {code: data.code, title: data.title, description: data.description, author: data.author};
        await loadBook(book, bookdir);

        books.push(book);
    }

    books.map( (book, i) => {
        book.packages.map((p, j) => {
            packages[p.meta.code] = p;
            p.topics.map( (topic, k) => {
                topic.sections.map( (section, k) => {
                    if(section.id) {
                        sections[section.id] = [book, p, topic, section];
                    }
                });
            });
        });
    });

    _books = books;
    _packages = packages;
    _sections = sections;
}

loadBooks();
watchBooks();

/*
loadMeta();
loadLivePackages();
watchLivePackages(); */