'use strict';

const { spawn } = require('child_process');

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

    return new Promise( function( resolve, reject) {
        proc.on( 'error', () => {
            if( !alreadyRejected) {
                alreadyRejected = true;
                reject();
            }
        });

        proc.on('exit', (code) => {
            if (code !== 0) {
                if (!alreadyRejected) {
                    alreadyRejected = true;
                    reject();
                }
            }
            else {
                resolve({stdout: stdoutChunks.join(''), stderr: stderrChunks.join('')});
            }
        });
    });
}

module.exports = { exec };