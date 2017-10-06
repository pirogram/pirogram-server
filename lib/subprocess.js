'use strict';

const { spawn } = require('child_process');
const winston = require('winston');

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
        winston.error('Error in executing command.', {cmd, args, opts, stdin});
        if( stdoutChunks.length) {
            winston.error(stdoutChunks.join('\n'));
        }
        if( stderrChunks.length) {
            winston.error(stderrChunks.join('\n'));
        }
    }

    return new Promise( function( resolve, reject) {
        proc.on( 'error', () => {
            if( !alreadyRejected) {
                alreadyRejected = true;
                winston.error('Got an error');
                logStreams();
                reject( new Error());
            }
        });

        proc.on('exit', (code) => {
            if (code !== 0) {
                if (!alreadyRejected) {
                    alreadyRejected = true;
                    winston.error( 'exit code', {code});
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