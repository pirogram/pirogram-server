'use strict';

const {markdownToHtml} = require('../lib/markdown');
const hljs = require('highlight.js');
const {keys, pull, assign, cloneDeep} = require('lodash');
const hash = require('object-hash');

const cleaners = {};

function categorizationQuestionCleaner( data) {
    data.questionHtml = data.question ?  markdownToHtml( data.question) : '';
    data.solutionHtml = data.solution ? hljs.highlight('python', data.solution, true).value : '';
    if( !data.categories || !data.categories.length) {
        data.categories = []
        for( const mapping of data.mappings) {
            data.categories.push( mapping.answer)
        }
    }

    data.challenges = keys(section.mappings)

    return data;
}

function codingQuestionCleaner( data) {
    data.questionHtml = data.question ?  markdownToHtml( data.question) : '';
    data.solutionHtml = data.solution ? hljs.highlight('python', data.solution, true).value : '';
    data.testLines = pull( data.tests.split(/\r?\n/), '');
    data.testsHtml = data.testLines.map( (testLine, index) => {
        return {content: hljs.highlight('python', testLine, true).value}
    });

    return data;
}

function testlessCodingQuestionCleaner(data) {
    data.questionHtml = data.question ?  markdownToHtml( data.question) : '';

    return data;
}

function fillInTheBlankQuestionCleaner( data) {
    data.questionHtml = data.question ?  markdownToHtml( data.question) : '';
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
    data.html = markdownToHtml( data.text);

    return data;
}

function multipleChoiceQuestionCleaner( data) {
    data.questionHtml = data.question ? markdownToHtml( data.question) : '';
    data.solutionHtml = data.solution ? hljs.highlight('python', data.solution, true).value : '';
    data.options = data.options || [];

    data.correctIds = [];
    const options = []
    data.options.map((option, index) => {
        if( option.text.toString === '') return

        const o = {id: index.toString(), text: option.text.toString(), 
            html: markdownToHtml(option.text.toString())};
        if( option.correct) data.correctIds.push( index.toString());

        options.push( o)
    });

    data.options = options

    data.selectedIds = [];

    return data;
}

function qualitativeQuestionCleaner( data) {
    data.questionHtml = data.question ?  markdownToHtml( data.question) : '';

    return data;
}

function tbdTypeCleaner( data) {
    return data
}

cleaners['categorization-question'] = categorizationQuestionCleaner;
cleaners['coding-question'] = codingQuestionCleaner;
cleaners['testless-coding-question'] = testlessCodingQuestionCleaner;
cleaners['fill-in-the-blank-question'] = fillInTheBlankQuestionCleaner;
cleaners['live-code'] = liveCodeCleaner;
cleaners['markdown'] = markdownCleaner;
cleaners['multiple-choice-question'] = multipleChoiceQuestionCleaner;
cleaners['qualitative-question'] = qualitativeQuestionCleaner;
cleaners['tbd'] = tbdTypeCleaner


export class Section {
    constructor( data) {
        data.type = (data.type && cleaners[data.type]) ? data.type : "markdown";
        if( data.hasOwnProperty('code') && !data.code) {
            data.code = ''
        }

        this.id = data.id || hash(data);

        const cleaner = cleaners[ data.type];
        assign( this, cleaner(data));
    }

    clean() {
        const cleaner = cleaners[ this.type];
        cleaner(this)
    }

    initBlank() {
        switch( this.type) {
            case 'markdown': 
                this.text = ''
                break
            case 'live-code':
                this.code = ''
                break
            case 'coding-question':
                this.question = this.code = this.tests = ''
                break
            case 'testing-coding-question':
                this.question = this.code = ''
                break
            case 'multiple-choice-question':
                this.question = ''
                this.options = []
                break
            case 'fill-in-the-blank-question':
                this.question = ''
                this.blanks = []
                break
            case 'categorization-question':
                this.question = ''
                this.mappings = []
                break
        }

        this.clean()
    }

    clone() {
        return new Section( cloneDeep( this));
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