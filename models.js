'use strict';

const config = require('config');

const knex = require('knex')({
    client: 'postgres',
    connection: {
        host     : config.get('db.host'),
        user     : config.get('db.user'),
        password : config.get('db.password'),
        database : config.get('db.name'),
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
    idAttribute: ['module_id', 'topic_id', 'exercise_id'],
    hasTimestamps: true
});

const Module = bookshelf.Model.extend({
    tableName: 'module',
    idAttribute: 'slug',
    hasTimestamps: true
});

const CodePlaygroundData = bookshelf.Model.extend({
    tableName: 'code_playground_data',
    idAttribute: ['user_id', 'playground_id'],
    hasTimestamps: true
});

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
        eh[obj.attributes.exercise_id] = obj.attributes;
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

async function getPlaygroundDataset( userId, playgroundIds) {
    const objs = await CodePlaygroundData.query( function(qb) {
        qb.whereIn('playground_id', playgroundIds).andWhere('user_id', userId);
    }).fetchAll();

    const playgroundDataset = {};

    objs.each( function( obj) {
        playgroundDataset[obj.attributes.playground_id] = obj.attributes;
    });

    return playgroundDataset;
}


async function getCodeForPlayground( userId, playgroundId) {
    try {
        return await new CodePlaygroundData( {user_id: userId, playground_id: playgroundId}).fetch();
    } catch( e) {
        return null;
    }
}

async function savePlaygroundCode( userId, playgroundId, code) {
    const codePlaygroundData = await getCodeForPlayground( userId, playgroundId);
    const method = codePlaygroundData ? 'update' : 'insert';

    if( !codePlaygroundData) {
        await new CodePlaygroundData({user_id: userId, playground_id: playgroundId, code: code}).save();
    } else {
        await new CodePlaygroundData().where({user_id: userId, playground_id: playgroundId}).save({code}, {patch: true});
    }
}

async function getExercise( moduleId, topicId, exerciseId) {
    try {
        return await new Exercise({module_id: moduleId, topic_id: topicId, exercise_id: exerciseId}).fetch();
    } catch( e) {
        return null;
    }
}

async function saveExercise(moduleId, topicId, exerciseId, type, content) {
    const exercise = await getExerciseById(moduleId, topicId, exerciseId);
    if( !exercise) {
        return await new Exercise({module_id: moduleId, topic_id: topicId, exercise_id: exerciseId, type, content}).save({}, {method:'insert'});
    } else {
        await exercise.save({type, content}, {method: 'update', patch: true});
    }
}

async function saveTopicHistory( userId, topicId) {
    try {
        await new TopicHistory({user_id: userId, topic_id: topicId}).save();
    } catch( e) {
        // ignore duplicate save.
    }
}

async function getAllModules() {
    return await Module.collection().fetch();
}

async function getModuleBySlug( slug) {
    try {
        return await new Module( {slug: slug}).fetch();
    } catch( e) {
        return null;
    }
}

async function createModule(name, slug, tocYaml) {
    return await new Module({name, slug, toc_yaml: tocYaml}).save({}, {method:'insert'});
}

module.exports = { bookshelf, User, Topic,
    getUserByEmail, createUser, getUserById, getTopicBySlug, getExerciseHistory, saveExerciseHistory,
    saveTopic, getTopicHistory, saveTopicHistory, saveExercise, getExercise, Module, getAllModules,
    getModuleBySlug, createModule, savePlaygroundCode, getPlaygroundDataset};