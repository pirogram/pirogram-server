'use strict';

const commonmark = require('commonmark');
const uuidv4 = require('uuid/v4');
const cheerio = require('cheerio');
const hljs = require('highlight.js');

function markdownToHtml( markdown) {
    const reader = new commonmark.Parser();
    const writer = new commonmark.HtmlRenderer();
    const parsed = reader.parse( markdown);
    let html = writer.render( parsed);

    const $ = cheerio.load( html, { useHtmlParser2:true });
    $('pre code').each((i, elem) => {
        const $this = cheerio(elem);
        const className = $this.attr('class');

        if (className && className.indexOf('language-') >= 0) {
            $this.html( hljs.highlight('python', $this.text(), true).value);
        }

        $this.addClass('hljs');
    });

    html = $.html('body');
    html = html.slice(6, html.length-7);

    return html;
}

function textToMcQuiz( id, markdown) {
    const lines = markdown.split( '\n');
    const textLines = [];
    const options = [];
    const reOption = /^\s*\[(#|\s)\]\s/;

    let line = null;
    let optionKey = 1;
    for( line of lines) {
        line = line.trim();
        if( !line && textLines.length === 0) continue;

        if( !reOption.exec(line)) {
            if( options.length === 0) { textLines.push( line); }
        } else {
            const option = { text: line.slice(3).trim(), key: optionKey};
            option.html = markdownToHtml(option.text);

            optionKey++;

            if( line[1] === '#') {
                option.correct = true;
            }

            options.push( option);
        }
    }

    const text = textLines.join('\n');
    return {id, text, html: markdownToHtml(text), options, markdown};
}

function textToRegexQuiz( id, markdown) {
    const lines = markdown.split( '\n');
    const textLines = [];
    const options = [];
    let solution = "";
    const reOption = /^\s*\[(#|\s)\]\s/;

    let line = null;
    for( line of lines) {
        line = line.trim();
        if( !line && textLines.length === 0) continue;

        if( reOption.exec(line)) {
            const option = {text: line.slice(3).trim(), shouldMatch: false};

            if (line[1] === '#') {
                option.shouldMatch = true;
            }

            options.push( option);
        } else {
            if( options.length === 0) {
                textLines.push( line);
            }
            else if( line.startsWith( 'Solution:')) {
                solution = line.slice('Solution:'.length).trim()
            }
        }
    }

    const text = textLines.join('\n');
    return {id, text, html: markdownToHtml(text), solution, options, markdown};
}

function textToOfflineExercise( id, markdown) {
    const lines = markdown.split( '\n');
    const textLines = [];
    const solutionLines = [];

    let isSolution = false;
    for( let line of lines) {
        if( line.trim().indexOf('Solution:') == 0) {
            isSolution = true;
            continue;
        }

        if( !isSolution) {
            textLines.push(line);
        } else {
            solutionLines.push(line);
        }
    }

    const text = textLines.join('\n');
    const solution = solutionLines.join('\n');

    return {id, text: text, html:markdownToHtml(text), markdown, solution, solutionHtml: markdownToHtml(solution)};
}

function convertQuizContent( type, id, block) {
    if( type === 'mcquiz') {
        return Object.assign({type: 'mcquiz'}, textToMcQuiz( id, block));
    } else if( type === 'regexquiz') {
        return Object.assign({type: 'regexquiz'}, textToRegexQuiz( id, block));
    } else if( type === 'offline-exercise') {
        return Object.assign({type: 'offline-exercise'}, textToOfflineExercise( id, block));
    }
}

function parseMarkdown( markdown) {
    const re = /^--([a-z-]+):([a-z0-9-]+)[\s\S]([\s\S]+?)^--$/mg;
    const results = [];
    let result = null;
    while( result = re.exec( markdown)) {
        results.push( result);
    }

    if( results.length === 0) {
        return [{id: uuidv4(), type: 'text', html: markdownToHtml(markdown), markdown: markdown}];
    }

    const exerciseIds = [];
    const chunks = [];
    let prevEnd = 0;
    for( result of results) {
        const start = result.index;
        const length = result[0].length;

        const md = markdown.slice( prevEnd, start);
        const html = markdownToHtml( md);
        chunks.push( {id: uuidv4(), type: 'text', html, markdown: md});

        prevEnd = start + length;

        const exerciseType = result[1];
        const exerciseId = result[2];
        const exerciseBlock = result[3];

        exerciseIds.push( exerciseId);

        chunks.push( convertQuizContent( exerciseType, exerciseId, exerciseBlock));
    }

    return chunks;
}

module.exports = { parseMarkdown, markdownToHtml, convertQuizContent};