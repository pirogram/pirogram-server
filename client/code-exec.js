import {dispatch, addListener} from './nux';
import axios from 'axios';
import uuid from 'uuid/v4';

let sessionId = null;
let sessionIsAlive = false;

function keepAlive() {
    setInterval( () => {
        if( !sessionId || !sessionIsAlive) { return; }

        axios({
            method: 'get',
            url: `/code-keepalive?sessionId=${sessionId}`,
            timeout: 3000
        })
        .then((response) => {
            if( !response.data.isAlive) {
                sessionIsAlive = false;
                dispatch( 'CODE_SESSION_DEAD', {});
            } else {
                sessionIsAlive = true;
                dispatch( 'CODE_SESSION_ALIVE', {});
            }
        })
        .catch((err) => {
            sessionIsAlive = false;
            dispatch( 'CODE_SESSION_DEAD', {});
        })
    }, 15000);
}

function onCodeExecutionRequest( data) {
    if( !window.initialStore.user) {
        dispatch( 'CODE_EXECUTION_REQUIRES_LOGIN', {playgroundId: data.playgroundId});
        return;
    }

    if( sessionId && !sessionIsAlive) {
        dispatch( 'CODE_SESSION_DEAD', {});
        return;
    }

    const executionId = uuid();
    const reqdata = {code: data.code, executionId, playgroundId: data.playgroundId};

    if( sessionId) {
        reqdata.sessionId = sessionId;
    }
    
    const url = data.route == 'exercise' ? `/exercise/${data.compositeId}/solution` : '/code-requests';

    axios.post(url, reqdata)
    .then((response) => {
        if( !sessionId) { 
            sessionId = response.data.sessionId;
            sessionIsAlive = true;
            keepAlive();
        }

        dispatch('CODE_EXECUTION_SUCCESS', {playgroundId: data.playgroundId, 
            output: response.data.output, testResults: response.data.testResults, 
            solutionIsCorrect: response.data.solutionIsCorrect, hasError: response.data.hasError});
    })
    .catch( (err) => {
        dispatch('CODE_EXECUTION_FAILURE', {playgroundId: data.playgroundId});
    });

    dispatch('CODE_EXECUTION_IN_PROGRESS', {playgroundId: data.playgroundId});
}

export function initCodeExecutor() {
    addListener( 'CODE_EXECUTION_REQUEST', onCodeExecutionRequest);
}