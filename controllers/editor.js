'use strict';

'use strict;'
require('babel-register')({
    presets: ["es2015", "react", "stage-2"]
});
require('babel-polyfill');

const Koa = require('koa');
const router = require( 'koa-route');
const _ = require('lodash');
const models = require( '../models');
const {logger} = require('../lib/logger');
const cms = require('../lib/cms');
import {ensureSuperuser} from '../lib/util';
import TOC from '../client/components/toc.jsx';
import TopicEditor from '../client/components/topic-editor.jsx';
const React = require('react');
const ReactDOMServer = require('react-dom/server');

const editorApp = new Koa();

editorApp.use( router.get( '/editor/:bookCode/:topicCode', async function( ctx, bookCode, topicCode) {
    if( !ensureSuperuser( ctx)) { return }

    const book = cms.getBookByCode( bookCode)
    if( !book) { ctx.status = 404; return; }

    const toc = cms.createTOC( book)

    let topic = book.getTopicByCode( topicCode)
    if( !topic) { ctx.status = 404; return; }
    topic = topic.clone()

    const currEntryIndex = {
        jointIndex: topic.index,
        groupIndex: parseInt( topic.index.split('.')[0]), 
        topicIndex: parseInt( topic.index.split('.')[1])
    }

    const tocHtml = ReactDOMServer.renderToString(
        <TOC toc={toc} currEntryIndex={currEntryIndex} />
    );
    const topicHtml = ReactDOMServer.renderToString(
        <TopicEditor topic={topic} userId={ctx.state.user.id}/>
    );

    await ctx.render( 'topic-editor', 
        {book, toc, topic, topicHtml, tocHtml, currEntryIndex}, 
        {toc, topic, currEntryIndex});
}))

module.exports = {editorApp}