'use strict';

const { spawn } = require('child_process');
const {logger} = require('./logger');

async function exec( cmd, args, opts, stdin) {
    const proc = spawn( cmd, args, opts);
    const stdoutChunks = [];
    const stderrChunks = [];
    let alreadyRejected = false;

    proc.stdout.on( 'data', (data) => {
        stdoutChunks.push( data);
    });

    proc.stderr.on( 'data', (data) => {
        stderrChunks.push( data);
    });

    if( stdin) {
        proc.stdin.write( stdin);
        proc.stdin.end();
    }

    function logStreams() {
        let stdout = '', stderr = '';
        if( stdoutChunks.length) {
            stdout = stdoutChunks.join('\n');
        }
        if( stderrChunks.length) {
            stderr = stderrChunks.join('\n');
        }
        logger.emit('subprocess', {type: 'command-exec-error', cmd, args, opts, stdin, stdout, stderr});
    }

    return new Promise( function( resolve, reject) {
        proc.on( 'error', () => {
            if( !alreadyRejected) {
                alreadyRejected = true;
                logStreams();
                reject( new Error());
            }
        });

        proc.on('exit', (code) => {
            if (code !== 0) {
                if (!alreadyRejected) {
                    alreadyRejected = true;
                    logStreams();
                    reject( new Error());
                }
            }
            else {
                resolve({stdout: stdoutChunks.join(''), stderr: stderrChunks.join('')});
            }
        });
    });
}

module.exports = { exec };