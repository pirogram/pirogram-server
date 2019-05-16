'use strict';

const utils = require('../lib/util');
const hljs = require('highlight.js');
const {keys, pull, assign} = require('lodash');
const hash = require('object-hash');

const cleaners = {};

function categorizationQuestionCleaner( data) {
    data.questionHtml = data.question ?  utils.markdownToHtml( data.question) : '';
    data.solutionHtml = data.solution ? hljs.highlight('python', data.solution, true).value : '';
    data.categories = data.categories || _.values( data.mappings);
    data.categories = data.categories.map((c, i) => c.toString());
    data.challenges = keys(section.mappings)

    return data;
}

function codingQuestionCleaner( data) {
    data.questionHtml = data.question ?  utils.markdownToHtml( data.question) : '';
    data.solutionHtml = data.solution ? hljs.highlight('python', data.solution, true).value : '';
    data.tests = pull( data.tests.split(/\r?\n/), '');
    data.testsHtml = data.tests.map( (test, index) => {
        return {content: hljs.highlight('python', test, true).value}
    });

    return data;
}

function testlessCodingQuestionCleaner(data) {
    data.questionHtml = data.question ?  utils.markdownToHtml( data.question) : '';

    return data;
}

function fillInTheBlankQuestionCleaner( data) {
    data.questionHtml = data.question ?  utils.markdownToHtml( data.question) : '';
    data.solutionHtml = data.solution ? hljs.highlight('python', data.solution, true).value : '';
    data.blanks.map( (blank, i) => { blank.answer = blank.answer.toString(); });
    data.labels = data.blanks.map( (blank, index) => blank.label)

    return data;
}

function liveCodeCleaner( data) {
    data.code = data.code ? data.code.replace(/\n+$/gi, '') : '';
    return data;
}

function markdownCleaner( data) {
    data.html = utils.markdownToHtml( data.text);

    return data;
}

function multipleChoiceQuestionCleaner( data) {
    data.questionHtml = data.question ?  utils.markdownToHtml( data.question) : '';
    data.solutionHtml = data.solution ? hljs.highlight('python', data.solution, true).value : '';

    data.correctIds = [];
    const options = data.options.map((option, index) => {
        const o = {id: index.toString(), text: option.text.toString(), 
            html: utils.markdownToHtml(option.text.toString())};
        if( option.correct) data.correctIds.push( index.toString());

        return o;
    });

    data.options = options;
    data.selectedIds = [];

    return data;
}

function qualitativeQuestionCleaner( data) {
    data.questionHtml = data.question ?  utils.markdownToHtml( data.question) : '';

    return data;
}

cleaners['categorization-question'] = categorizationQuestionCleaner;
cleaners['coding-question'] = codingQuestionCleaner;
cleaners['testless-coding-question'] = testlessCodingQuestionCleaner;
cleaners['fill-in-the-blank-question'] = fillInTheBlankQuestionCleaner;
cleaners['live-code'] = liveCodeCleaner;
cleaners['markdown'] = markdownCleaner;
cleaners['multiple-choice-question'] = multipleChoiceQuestionCleaner;
cleaners['qualitative-question'] = qualitativeQuestionCleaner;


export class Section {
    constructor(bookCode, topicCode, data) {
        this.bookCode = bookCode;
        this.topicCode = topicCode;

        data.type = (data.type && cleaners[data.type]) ? data.type : "markdown";
        if( data.hasOwnProperty('code') && !data.code) {
            data.code = ''
        }

        this.id = data.id || hash(data);

        const cleaner = cleaners[ data.type];
        assign( this, cleaner(data));
    }

    clone() {
        return new Section(this.bookCode, this.topicCode, this);
    }

    isExercise() {
        if( this.type == 'multiple-choice-question' ||
            this.type == 'coding-question' ||
            this.type == 'categorization-question' ||
            this.type == 'qualitative-question' ||
            this.type == 'fill-in-the-blank-question' ||
            this.type == 'testless-coding-question') { 
                return true;
        }
    
        return false;
    }

    canHaveCodePlayground() {
        if( this.isExercise() || this.type == 'live-code') {
            return true;
        }
    
        return false;
    }
}