'use strict';

const models = require( '../models');

export async function addUserStateToToC( toc, userId) {
    const codes = [];

    for( const group of toc.topicGroups) {
        codes.push( group.code)
        for( const topic of group.topics) {
            codes.push( topic.code)
        }
    }

    const thObjs = await models.getTopicHistory( userId, toc.code, codes);

    for( const group of toc.topicGroups) {
        group.done = thObjs[ group.code] ? true : false
        for( const topic of group.topics) {
            topic.done = thObjs[ topic.code] ? true : false
        }
    }

    return thObjs
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

export async function addUserStateToTopic( topic, userId) {
    let exerciseIds = topic.exerciseIds;

    const ehobjs = await models.getExerciseHistory( userId, exerciseIds);

    for( const section of topic.sections) {
        if( !ehobjs[section.id]) {
            continue; 
        }

        const eh = ehobjs[section.id];
        addUserStateToSection( section, eh);
    }

    const counts = await models.getSolutionCounts( exerciseIds);
    for( const section of topic.sections) {
        section.solutionCount = counts[section.id] ? counts[section.id] : 0;
    }

    const playgroundIds = topic.getPlaygroundIds();
    const playgroundData = await models.getPlaygroundData( userId, playgroundIds);

    topic.sections.map((section, index) => {
        if( playgroundData[ section.id]) {
            section.userCode = playgroundData[ section.id].code;
        }
    });
}

export async function markDoneTopicAsDone( userId, book, topic, thObjs) {
    if( !thObjs) {
        thObjs = await models.getTopicHistory( userId, book.code, [topic.code]);
    }

    if( thObjs[topic.code]) { return }

    const exerciseIds = topic.exerciseIds;

    if( exerciseIds.length) {
        const eh = await models.getExerciseHistory( userId, exerciseIds);
        for( const id of exerciseIds) {
            if( !eh[id]) {
                return;
            }
        }
    }

    await models.saveTopicHistory( userId, book.code, topic.code);
}

export async function markDoneGroupAsDone( userId, book, group, thObjs) {
    if( thObjs[ group.code]) { return }

    for( const topic of group.topics) {
        if( !thObjs[ topic.code]) { return }
    }

    await models.saveTopicHistory( userId, book.code, group.code);
}

export async function updateLastVisitedTopic( userId, bookCode, topicCode) {
    const currTime = new Date();

    await models.query(`INSERT INTO last_topic_marker (user_id, book_code, topic_code, created_at, updated_at) values ($1, $2, $3, $4, $4) ON CONFLICT (user_id, book_code) DO UPDATE SET topic_code=$3, updated_at=$4`, [userId, bookCode, topicCode, currTime]);
}

export async function getLastVisitedTopic( userId, bookCode) {
    const {rows} = await models.query(`SELECT * FROM last_topic_marker WHERE user_id=$1 and book_code=$2`, 
            [userId, bookCode]);

    return rows.length ? rows[0].topic_code : null;
}