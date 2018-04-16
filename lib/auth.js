const models = require('../models');

async function setSessionUser( ctx, next) {
    if( ctx.session.userId) {
        const user = await models.getUserById(ctx.session.userId);
        if( user && !user.attributes.is_deleted) {
            ctx.state.user = user.attributes;
        }
    }

    await next();
}

module.exports = {setSessionUser};