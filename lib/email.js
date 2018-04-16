'use strict';

const axios = require('axios');
const config = require('config');
const {logger} = require('./logger');
const mailgun = require('mailgun-js');

function sendEmailViaStdout( from, to, subject, text, html) {
    console.log(`From: ${from}`);
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    if( html) {
        console.log('MIME-Version: 1.0');
        console.log('Content-Type: multipart/alternative;');
        console.log('boundary="---boundary---"');
    }

    console.log('');

    if( html) {
        console.log('---boundary---');
        console.log('Content-type: text/plain; charset=iso-8859-1');
        console.log('Content-Transfer-Encoding: quoted-printable');
        console.log('');
    }

    console.log(text);

    if( html) {
        console.log('---boundary---');
        console.log('Content-type: text/html; charset=iso-8859-1');
        console.log('Content-Transfer-Encoding: quoted-printable');
        console.log('');
        console.log(html);
        console.log('');
        console.log('---boundary---');
    }
}

async function sendEmailViaMailgun( from, to, subject, text, html) {
    const data = {from, to, subject, text};
    if( html) { data.html = html; }
    const domain = config.get('email.mailgun_domain') || config.get('domain.base');
    
    const m = mailgun({apiKey: config.get('email.mailgun_apikey'), domain: domain});
    
    return new Promise( function( resolve, reject) {
        m.messages().send(data, function( error, body) {
            if( error) { reject( error); }
            else { resolve(); }
        });
    });
}

async function sendEmail(from, to, subject, text, html) {
    const engine = config.get('email.engine');
    if( engine == 'stdout') {
        sendEmailViaStdout( from, to, subject, text, html);
    } else if( engine == 'mailgun') {
        await sendEmailViaMailgun( from, to, subject, text, html);
    } else {
        logger.emit('email', {type: 'incorrect-email-engine', engine, error: true});
    }
}

module.exports = {sendEmail};