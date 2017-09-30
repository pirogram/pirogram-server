'use strict';

module.exports = (ctx, next) => {
    try {
        return next();
    } catch( e) {
        console.log(e);
        throw e;
    }
}