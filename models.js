'use strict';

const config = require('config');
const {logger} = require('./lib/logger');
const reservedUsernames = require('./lib/reserved-usernames');
const _ = require('lodash');
const { Pool, Client } = require('pg')

const pool = new Pool({
    host     : config.get('db.host'),
    user     : config.get('db.user'),
    password : config.get('db.password'),
    database : config.get('db.name'),
    charset  : 'utf8'
});

export async function query(text, params) {
    return await pool.query( text, params);
}

export async function getUserById ( id) {
    const {rows} = await query('SELECT * FROM users WHERE id = $1', [id]);
    
    return rows.length ? rows[0] : null;
}

export async function getUserByEmail( email) {
    const {rows} = await query('SELECT * FROM users WHERE email = $1 AND NOT is_deleted', [email]);
    
    return rows.length ? rows[0] : null;
}

export async function getUserByUsername( username) {
    const {rows} = await query('SELECT * FROM users WHERE username = $1 AND NOT is_deleted', 
        [username.toLowerCase()]);
    
    return rows.length ? rows[0] : null;
}

export async function isUsernameAvaialble( username) {
    if( reservedUsernames[ username.toLowerCase()]) {
        return false;
    }

    const user = await getUserByUsername( username);
    if(user) { return false; }

    return true;
}


export async function createUser( username, email, avatar) {
    const {rows} = await query('INSERT INTO users (name, username, email, avatar, active) values ($1, $2, $3, $4, $5) RETURNING *', [username, username.toLowerCase(), email, avatar, 't']);
    
    return rows[0];
}

export async function createPasswordResetRequest( id, userId) {
    await query('INSERT INTO password_reset_requests (id, user_id) values ($1, $2)', [id, userId]);
}

export async function getPasswordResetRequest( id) {
    const {rows} = await query('SELECT * FROM password_reset_requests WHERE id = $1', [id]);

    return rows.length ? rows[0] : null;
}

export async function getExerciseHistory( userId, exerciseIds) {
    const {rows} = await query('SELECT * FROM exercise_history WHERE user_id = $1 AND exercise_id = ANY($2)', 
        [userId, exerciseIds]);

    const eh = {};

    rows.map( (obj, i) => {
        eh[obj.exercise_id] = obj;
    });

    return eh;
}

export async function saveExerciseHistory( userId, exerciseId, solution) {
    await query( 'INSERT INTO exercise_history (user_id, exercise_id, solution) VALUES ($1, $2, $3) ON CONFLICT (user_id, exercise_id) DO UPDATE SET solution = $3', [userId, exerciseId, solution]);
}

export async function getTopicHistory( userId, topicIds) {
    const {rows} = await query('SELECT * FROM topic_history WHERE user_id = $1 AND topic_id = ANY($2)', 
    [userId, topicIds]);

    const th = {};

    rows.map( (obj, i) => {
        th[obj.topic_id] = obj;
    });

    return th;
}

export async function getPlaygroundData( userId, playgroundIds) {
    const {rows} = await query('SELECT * FROM code_playground_data WHERE user_id = $1 AND playground_id = ANY($2)', 
    [userId, playgroundIds]);

    const playgroundData = {};

    rows.map( (obj, i) => {
        playgroundData[obj.playground_id] = obj;
    });

    return playgroundData;
}


export async function getCodeForPlayground( userId, playgroundId) {
    const {rows} = await query('SELECT * FROM code_playground_data WHERE user_id = $1 AND playground_id = $2', 
    [userId, playgroundId]);

    return rows.length ? rows[0] : null;
}

export async function savePlaygroundCode( userId, playgroundId, code) {
    await query( 'INSERT INTO code_playground_data (user_id, playground_id, code) VALUES ($1, $2, $3) ON CONFLICT (user_id, playground_id) DO UPDATE SET code = $3', [userId, playgroundId, code]);
}

export async function saveTopicHistory( userId, topicId) {
    await query( 'INSERT INTO topic_history (user_id, topic_id) values ($1, $2) ON CONFLICT (user_id, topic_id) DO NOTHING', [userId, topicId]);
}

export async function getPackageHistory( userId, packageIds) {
    const {rows} = await query('SELECT * FROM package_history WHERE user_id = $1 AND package_id = ANY($2)', 
    [userId, packageIds]);

    const ph = {};

    rows.map( (obj, i) => {
        ph[obj.package_id] = obj;
    });

    return ph;
}

export async function getSinglePackageHistory( userId, packageId) {
    const {rows} = await query('SELECT * FROM package_history WHERE user_id = $1 AND package_id = $2', 
    [userId, packageId]);

    return rows.length ? rows[0] : null;
}

export async function savePackageHistory( userId, packageId) {
    await query( 'INSERT INTO package_history (user_id, package_id) values ($1, $2) ON CONFLICT (user_id, package_id) DO NOTHING', [userId, packageId]);
}