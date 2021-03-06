'use strict';

import { Book } from '../codebook/book';
import {Topic} from '../codebook/topic';
import { TopicGroup } from '../codebook/topic-group';

const {glob, loadFileContent} = require('./util');
const {logger} = require('./logger');
const config = require('config');
const path = require('path');
const _ = require('lodash');
const watch = require('node-watch');
const yaml = require('js-yaml');
const axios = require('axios')
const subprocess = require('../lib/subprocess')

let _books = [];
let _sectionIds = {};
let _pendingBooksLoad = false;


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


export function getBookByCode( bookCode) {
    for( const book of _books) {
        if( book.code == bookCode) { return book }
    }

    logger.emit( 'cms', { event: 'book-not-found', bookCode})
    return null
}

export function createTOC( book) {
    return _.cloneDeepWith( book, (value, key) => {
        return key == 'sections' ? [] : undefined
    })
}

export function getSectionLineageById( sectionId) {
    if( !_sectionIds[ sectionId]) {
        return [null, null, null]
    } else {
        return _sectionIds[ sectionId]
    }
}

export function allBooks() {
    return _books
}


async function addTopicToGroup( book, topicGroup, data) {
    let content, docs;

    try {
        content = await loadFileContent( path.join(book.path, "topics", `${data.code}.yaml`));
    } catch( e) {
        logger.emit('cms', {event: 'topic-load-error', file: data.code, e});
        throw `Failed to load topic from file ${data.code}.yaml. ${e.message}`;
    }

    try {
        docs = yaml.safeLoadAll( content);
    } catch( e) {
        logger.emit('cms', {event: 'topic-load-error', file: data.code, e});
        throw `Failed to parse topic from file ${data.code}.yaml. ${e.message}`;
    }

    try {
        const t = new Topic( data, null);
        topicGroup.addTopic( t);
        t.initSections( docs);
    } catch( e) {
        console.log(e)
        logger.emit('cms', {event: 'topic-load-error', file: data.code, e});
        throw `Failed to instantiate topic from file ${data.code}.yaml. ${e.message}`;
    }
}

async function addGroupToBook( book, data) {
    const topicGroup = new TopicGroup( data.id, data.code, data.title)
    book.addGroup( topicGroup)
    for( const topic of data.topics) {
        await addTopicToGroup( book, topicGroup, topic)
    }
}

async function loadBooks() {
    const books = []
    const sectionIds = {}

    const bookdirs = await glob( path.join( config.get('pi_home'), 'books', 'published', '*'));

    for( const bookdir of bookdirs) {
        let content = null;
        try {
            content = await loadFileContent( path.join(bookdir, 'meta.yaml'));
        } catch(e) {
            logger.emit('cms', {event: 'meta-load-error', e});
            continue;
        }

        let data = null;
        try {
            data = yaml.safeLoad( content);
        } catch(e) {
            logger.emit('cms', {event: 'meta-load-error', e});
        }

        const book = new Book({code: data.code, title: data.title, description: data.description, 
            author: data.author, path: bookdir});
        
        for( const group of data.toc) {
            try {
                await addGroupToBook( book, group);
            } catch( e) {
                logger.emit('cms', {event: 'group-load-error', e, group});
            }
        }

        book.resetIndexes()
        books.push(book);

        for( const group of book.topicGroups) {
            for( const topic of group.topics) {
                for( const section of topic.sections) {
                    if( section.id) {
                        sectionIds[ section.id] = [book, topic, section]
                    }
                }
            }
        }
    }

    _books = books
    _sectionIds = sectionIds
    logger.emit( 'cms', { event: 'loaded-books', count: _books.length})
}

loadBooks();
watchBooks();

/* -- Git Backend Related Stuff -- */

export async function createBook( code, title) {
    const data = {name: code, description: title, homepage: `https://www.pirogram.com/@${code}`, 
        license_template: 'cc-by-sa-4.0'}
    const url = `https://api.github.com/orgs/pirogram/repos`;
    const oauthToken = config.get('github_oauth.content_oauth_token')
    const contentHome = config.get('pi_home')

    const response = await axios( {method: 'post', url, data, headers: {'Authorization': `token ${oauthToken}`}})
    if( response.status != 201) {
        logger.emit( 'cms', {event: 'github-repo-creation-failure', code, response})
        throw `Failed to create repo on Github.`
    }

    await subprocess.exec("/usr/bin/git", 
        ['clone', `https://${oauthToken}@github.com/pirogram/${code}`, `${contentHome}/books/${code}/published`])

    await subprocess.exec("/usr/bin/git", 
        ['clone', `https://${oauthToken}@github.com/pirogram/${code}`, `${contentHome}/books/${code}/draft`])
}