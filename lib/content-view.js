'use strict';

const models = require( '../models');
const _ = require('lodash');
const cms = require('./cms');

export function makePresentableSection( section) {
    if( section.type == 'markdown') {
        return {type: 'html', html: section.html};
    } else if( section.type == 'multiple-choice-question') {
        return {
            type: section.type, id: section.id, starterCode: section.code,
            question: section.questionHtml, options: section.options,
            done: false, selectedIds: [], meta: section.meta
        };
    } else if( section.type == 'live-code') {
        return { type: section.type, id: section.id,
            starterCode: section.code};
    } else if( section.type == 'testless-coding-question') {
        return { type: section.type, id: section.id,
            starterCode: section.code || '', meta: section.meta,
            done: false, question: section.questionHtml};
    } else if( section.type == 'coding-question') {
        return {
            type: section.type, id: section.id,
            done: false, meta: section.meta,
            starterCode: section.code || '',
            question: section.questionHtml,
            referenceSolution: section.solutionHtml,
            tests: section.testsHtml.map((html, index) => { 
                return {content: html}; 
            })
        }
    } else if( section.type == 'categorization-question') {
        return {
            type: section.type, id: section.id,
            done: false, meta: section.meta,
            question: section.questionHtml, starterCode: section.code,
            categories: section.categories, challenges: _.keys(section.mappings)
        }
    } else if( section.type == 'qualitative-question') {
        return {
            type: section.type, id: section.id, meta: section.meta,
            done: false, question: section.questionHtml
        }
    } else if( section.type == 'fill-in-the-blank-question') {
        return {
            type: section.type, id: section.id, meta: section.meta,
            done: false, question: section.questionHtml, starterCode: section.code,
            labels: section.blanks.map( (blank, index) => blank.label)
        }
    } else {
        return {type: 'html', html: markdownToHtml(`Unsupported section type: ${section.type}`)};
    }
}

export function makePresentableTopic(topic) {
    const presentableTopic = {meta: _.cloneDeep( topic.meta)};

    presentableTopic.sections = topic.sections.map( (section, i) => {
        return makePresentableSection( section);
    });

    return presentableTopic;
}


export function getExerciseIds( topic) {
    const exerciseIds = [];
    for( const section of topic.sections) {
        if( cms.isExercise(section)) { 
                exerciseIds.push( section.id);
        }
    }

    return exerciseIds;
}


export function addUserStateToSection( section, eh) {
    section.done = true;
    if( section.type == 'multiple-choice-question') {
        section.selectedIds = eh.solution.selectedIds;
    } else if( section.type == 'coding-question') {
        section.userCode = eh.solution.code || '';
    } else if( section.type == 'testless-coding-question') {
        section.userCode = eh.solution.code || '';
    } else if( section.type == 'categorization-question') {
        section.selectedCategories = eh.solution.selectedCategories;
    } else if( section.type == 'qualitative-question') {
        section.answer = eh.solution.answer;
    } else if( section.type == 'fill-in-the-blank-question') {
        section.answers = eh.solution.answers;
    }
}


function getPlaygroundIds( topic) {
    const plagroundIds = [];
    for( const section of topic.sections) {
        if( cms.canHaveCodePlayground(section)) { 
            plagroundIds.push( section.id);
        }
    }

    return plagroundIds;
}

export async function addUserStateToTopic( presentableTopic, userId) {
    let exerciseIds = getExerciseIds( presentableTopic);

    const ehobjs = await models.getExerciseHistory( userId, exerciseIds);

    for( const section of presentableTopic.sections) {
        if( !ehobjs[section.id]) {
            continue; 
        }

        const eh = ehobjs[section.id];
        addUserStateToSection( section, eh);
    }

    const counts = await models.getSolutionCounts( exerciseIds);
    for( const section of presentableTopic.sections) {
        section.solutionCount = counts[section.id] ? counts[section.id] : 0;
    }

    const playgroundIds = getPlaygroundIds( presentableTopic);
    const playgroundData = await models.getPlaygroundData( userId, playgroundIds);

    presentableTopic.sections.map((section, index) => {
        if( playgroundData[ section.id]) {
            section.userCode = playgroundData[ section.id].code;
        }
    });
}
