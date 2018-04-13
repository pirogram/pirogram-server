'use strict';

const config = require('config');
const _ = require('lodash');

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

const PackageHistory = bookshelf.Model.extend({
    tableName: 'package_history',
    idAttribute: ['user_id', 'package_id'],
    hasTimestamps: true
});

const ExerciseHistory = bookshelf.Model.extend({
    tableName: 'exercise_history',
    idAttribute: ['user_id', 'exercise_id'],
    hasTimestamps: true
});

const CodePlaygroundData = bookshelf.Model.extend({
    tableName: 'code_playground_data',
    idAttribute: ['user_id', 'playground_id'],
    hasTimestamps: true
});

const StudyQueue = bookshelf.Model.extend({
    tableName: 'study_queue',
    idAttribute: ['user_id', 'module_code'],
    hasTimestamps: true,

    // convert snake_case to camelCase
    parse: function(attrs) {
        return _.reduce(attrs, function(memo, val, key) {
            memo[_.camelCase(key)] = val;
            return memo;
        }, {});
    },

    // convert camelCase to snake_case
    format: function(attrs) {
        return _.reduce(attrs, function(memo, val, key) {
            memo[_.snakeCase(key)] = val;
            return memo;
        }, {});
    }
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

async function isModuleInQueue( userId, moduleCode) {
    const obj = await new StudyQueue({user_id: userId, module_code: moduleCode}).fetch();
    return obj == null ? false : true;
}

async function addModuleToQueue( userId, moduleCode) {
    if( !await isModuleInQueue( userId, moduleCode)) {
        await new StudyQueue({user_id: userId, module_code: moduleCode}).save();
    }
}

async function removeModuleFromQueue( userId, moduleCode) {
    if( await isModuleInQueue( userId, moduleCode)) {
        await new StudyQueue().where({user_id: userId, module_code: moduleCode}).destroy();
    }
}

async function getQueuedModules( userId) {
    const objs = await new StudyQueue({user_id: userId}).fetchAll();
    const moduleCodes = [];

    objs.each( function(obj) {
        moduleCodes.push( obj.attributes.moduleCode);
    });

    return moduleCodes;
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

async function getPlaygroundData( userId, playgroundIds) {
    const objs = await CodePlaygroundData.query( function(qb) {
        qb.whereIn('playground_id', playgroundIds).andWhere('user_id', userId);
    }).fetchAll();

    const playgroundData = {};

    objs.each( function( obj) {
        playgroundData[obj.attributes.playground_id] = obj.attributes;
    });

    return playgroundData;
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

async function saveTopicHistory( userId, topicId) {
    try {
        await new TopicHistory({user_id: userId, topic_id: topicId}).save();
    } catch( e) {
        // ignore duplicate save.
    }
}

async function getPackageHistory( userId, packageIds) {
    const objs = await PackageHistory.query( function(qb) {
        qb.whereIn('package_id', packageIds).andWhere('user_id', userId);
    }).fetchAll();

    const ph = {};

    objs.each( function( obj) {
        ph[obj.attributes.package_id] = obj.attributes;
    });

    return ph;
}

async function getSinglePackageHistory( userId, packageId) {
    const ph = await getPackageHistory( userId, [packageId]);
    return ph[packageId];
}

async function savePackageHistory( userId, packageId) {
    try {
        await new PackageHistory({user_id: userId, package_id: packageId}).save();
    } catch( e) {
        // ignore duplicate save.
    }
}

module.exports = { bookshelf, User, StudyQueue, addModuleToQueue, removeModuleFromQueue,
    getQueuedModules, getPackageHistory, getSinglePackageHistory, savePackageHistory,
    getUserByEmail, createUser, getUserById, getExerciseHistory, saveExerciseHistory,
    getTopicHistory, saveTopicHistory, savePlaygroundCode, getPlaygroundData};