'use strict';

const koaSession = require('koa-session');
const redis = require('./redis');
const config = require('config');

async function get(key, maxAge) {
    const sess = await redis.hget('sessions', key);
    return JSON.parse( sess);
}

async function set(key, sess) {
    redis.hset('sessions', key, JSON.stringify(sess));
}

async function destroy(key) {
    redis.hdel('sessions', key)
}

const opts = {
    key: 'session',
    maxAge: 86400000000,
    store: {get, set, destroy}
};

module.exports = function(app) {
    app.keys = [config.get('session.app_key')];
    return koaSession(opts, app);
};
