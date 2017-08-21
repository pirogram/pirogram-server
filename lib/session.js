'use strict';

const koaSession = require('koa-session');
const redis = require('./redis');

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
    app.keys = ['kl1234123412nkfnasodifhowfhsdjkfnakdf'];
    return koaSession(opts, app);
};
