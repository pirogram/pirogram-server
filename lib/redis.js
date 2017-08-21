'use strict';

const Redis = require('ioredis');
const redis = new Redis();

function hget(key, field) {
    return new Promise( (resolve, reject) => {
        redis.hget(key, field, function(err, result) {
           if( err) {
               reject(err);
           } else {
               resolve( result);
           }
        });
    });
}

function hset(key, field, value) {
    redis.hset(key, field, value);
}

function hdel( key, field) {
    redis.hdel( key, field);
}

module.exports = {
    hget, hset, hdel
}