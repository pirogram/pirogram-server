'use strict';

function addFlashMessage( session, category, message) {
    const messages = session.flashMessages || [];
    messages.push( { category, message});
    session.flashMessages = messages;
}

function getFlashMessages( session) {
    const messages = session.flashMessages;
    session.flashMessages = null;

    return messages;
}

module.exports = { addFlashMessage, getFlashMessages};
