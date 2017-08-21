'use strict';

const knex = require('knex')({
    client: 'postgres',
    connection: {
        host     : '127.0.0.1',
        user     : 'turtleprogrammer',
        password : 'turtleprogrammer',
        database : 'turtleprogrammer',
        charset  : 'utf8'
    }
});

const bookshelf = require('bookshelf')(knex);

const User = bookshelf.Model.extend({
    tableName: 'users',
    hasTimestamps: true
});

const Topic = bookshelf.Model.extend({
    tableName: 'topics',
    hasTimestamps: true
});

const TopicHistory = bookshelf.Model.extend({
    tableName: 'topic_history',
    idAttribute: ['user_id', 'topic_id'],
    hasTimestamps: true
});

const TopicEditHistory = bookshelf.Model.extend({
    tableName: 'topic_edit_history',
    hasTimestamps: true
});

const TopicDraft = bookshelf.Model.extend({
    tableName: 'topic_drafts',
    hasTimestamps: true
});

const ExerciseHistory = bookshelf.Model.extend({
    tableName: 'exercise_history',
    idAttribute: ['user_id', 'exercise_id'],
    hasTimestamps: true
});

const Exercise = bookshelf.Model.extend({
    tableName: 'exercises',
    idAttribute: 'uuid',
    hasTimestamps: true
})

async function getUserById ( id) {
    try {
        return await new User( { id: id}).fetch();
    }
    catch( e) {
        return null;
    }
}

async function getUserByEmail( email) {
    try {
        return await new User( { email: email}).fetch();
    }
    catch( e) {
        return null;
    }
}

async function getTopicBySlug( slug) {
    try {
        return await new Topic( {slug: slug}).fetch();
    } catch( e) {
        return null;
    }
}

async function createUser( name, email, avatar) {
    return await new User({name: name, email: email, avatar: avatar, active: true}).save();
}

async function getExerciseHistory( userId, exerciseIds) {
    const objs = await ExerciseHistory.query( function(qb) {
        qb.whereIn('exercise_id', exerciseIds).andWhere('user_id', userId);
    }).fetchAll();

    const eh = {};

    objs.each( function( obj) {
        eh[obj.attributes.exercise_id] = obj;
    });

    return eh;
}

async function saveExerciseHistory( userId, exerciseId, solution) {
    const eh = await getExerciseHistory(userId, [exerciseId]);
    const exerciseHistory = eh[exerciseId];
    
    if( !exerciseHistory) {
        return await new ExerciseHistory({user_id: userId, exercise_id: exerciseId, solution: solution}).save();
    } else {
        exerciseHistory.solution = solution;
        return await new ExerciseHistory().where({user_id: userId, exercise_id: exerciseId}).save({solution}, 
            {patch: true, method: 'update'});
    }
}

async function getTopicHistory( userId, topicIds) {
    const objs = await TopicHistory.query( function(qb) {
        qb.whereIn('topic_id', topicIds).andWhere('user_id', userId);
    }).fetchAll();

    const th = {};

    objs.each( function( obj) {
        th[obj.attributes.topic_id] = obj.attributes;
    });

    return th;
}

async function createTopic( slug, title, markdown, authorId) {
    return await new Topic({slug, title, markdown, author_id: authorId, version_number: 1}).save()
}

async function saveTopic( slug, title, markdown, authorId) {
    let topic = await getTopicBySlug( slug);
    
    if( !topic) {
        topic = await createTopic( slug, title, markdown, authorId);
    } else {
        topic = await topic.save({title, markdown, version_number: topic.attributes.version_number+1}, {patch: true});
    }

    await new TopicEditHistory({topic_id: topic.attributes.id, author_id: authorId, 
        version_number: topic.attributes.version_number,
        title: title, markdown: markdown, slug: slug
    }).save();
}

async function getExerciseById( uuid) {
    try {
        return await new Exercise({uuid}).fetch();
    } catch( e) {
        return null;
    }
}

async function saveExercise(uuid, type, markdown) {
    let exercise = await getExerciseById(uuid);
    if( !exercise) {
        return await new Exercise({uuid, type, markdown}).save({}, {method:'insert'});
    } else {
        await exercise.save({type, markdown}, {method: 'update', patch: true});
    }
}

async function saveTopicHistory( userId, topicId) {
    return await new TopicHistory({user_id: userId, topic_id: topicId}).save();
}

module.exports = { bookshelf, User, Topic,
    getUserByEmail, createUser, getUserById, getTopicBySlug, getExerciseHistory, saveExerciseHistory,
    saveTopic, getTopicHistory, saveTopicHistory, saveExercise, getExerciseById};