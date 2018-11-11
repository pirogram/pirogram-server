import {dispatch, addListener} from './nux';
import axios from 'axios';
import uuid from 'uuid/v4';

let sessionId = null;
let codeExecInProgress = false;
let queue = [];

const chaninedCodeExplorers = [];
let idsExecutedInSession = {};

function keepAlive() {
    setInterval( () => {
        if( !sessionId || codeExecInProgress) { return; }

        axios({
            method: 'get',
            url: `/code-keepalive?sessionId=${sessionId}`,
            timeout: 3000
        })
        .then((response) => {
            if( !response.data.isAlive) {
                dispatch( 'CODE_SESSION_DEAD', {});
            } else {
                dispatch( 'CODE_SESSION_ALIVE', {});
            }
        })
        .catch((err) => {
            dispatch( 'CODE_SESSION_DEAD', {});
        })
    }, 12000);
}

function onCodeExecutionChainNewLink( data) {
    chaninedCodeExplorers.push( data.codeExplorer);
}

function onCodeExecutionRequest( data) {
    if( !window.initialStore.user) {
        dispatch( 'CODE_EXECUTION_REQUIRES_LOGIN', {playgroundId: data.playgroundId});
        return;
    }

    if( data.chained) {
        for( const codeExplorer of chaninedCodeExplorers) {
            if( codeExplorer.props.id == data.playgroundId) { break; }

            if( !idsExecutedInSession[ codeExplorer.props.id]) {
                queue.push({code: codeExplorer.state.userCode, playgroundId: codeExplorer.props.id});
                dispatch( 'CODE_EXECUTION_QUEUED', {playgroundId: codeExplorer.props.id});
            }
        }
    }

    queue.push( data);
    dispatch( 'CODE_EXECUTION_QUEUED', {playgroundId: data.playgroundId});

    if( !codeExecInProgress) {
        workOnQueue();
    }
}

function workOnQueue() {
    if( queue.length) {
        execute( queue.shift());
    }
}

function execute( data) {
    const executionId = uuid();
    const reqdata = {code: data.code, executionId, playgroundId: data.playgroundId, 
        viewOnly: data.viewOnly || false};

    if( sessionId) {
        reqdata.sessionId = sessionId;
    }
    
    const url = data.route == 'exercise' ? `/exercise/${data.playgroundId}/solution` : '/code-requests';

    axios.post(url, reqdata)
    .then((response) => {
        if( !sessionId) { 
            sessionId = response.data.sessionId;
            keepAlive();
        }

        if( !response.data.needInput) {
            codeExecInProgress = false;
            idsExecutedInSession[data.playgroundId] = true;

            dispatch('CODE_EXECUTION_SUCCESS', {playgroundId: data.playgroundId, 
                output: response.data.output, testResults: response.data.testResults, 
                solutionIsCorrect: response.data.solutionIsCorrect, hasError: response.data.hasError});

            workOnQueue();
        } else {
            dispatch('CODE_EXECUTION_NEED_INPUT', {playgroundId: data.playgroundId, 
                output: response.data.output, hasError: response.data.hasError, 
                needInput: response.data.needInput});
        }
    })
    .catch( (err) => {
        codeExecInProgress = false;
        //dispatch('CODE_EXECUTION_FAILURE', {playgroundId: data.playgroundId});
        dispatch( 'CODE_SESSION_DEAD', {});
        console.log(err);
    });

    dispatch('CODE_EXECUTION_IN_PROGRESS', {playgroundId: data.playgroundId});
    codeExecInProgress = true;
}

function onCodeExecutionInputProvided( data) {
    const reqdata = {sessionId: sessionId, inputValue: data.inputValue, playgroundId: data.playgroundId};
    const url = `/code-input`;
    axios.post(url, reqdata)
    .then((response) => {
        if( !response.data.needInput) {
            codeExecInProgress = false;
            idsExecutedInSession[data.playgroundId] = true;

            dispatch('CODE_EXECUTION_SUCCESS', {playgroundId: data.playgroundId, 
                output: response.data.output, testResults: response.data.testResults, 
                solutionIsCorrect: response.data.solutionIsCorrect, hasError: response.data.hasError});

            workOnQueue();
        } else {
            dispatch('CODE_EXECUTION_NEED_INPUT', {playgroundId: data.playgroundId, 
                output: response.data.output, hasError: response.data.hasError, 
                needInput: response.data.needInput});
        }
    })
    .catch( (err) => {
        codeExecInProgress = false;
        //dispatch('CODE_EXECUTION_FAILURE', {playgroundId: data.playgroundId});
        dispatch( 'CODE_SESSION_DEAD', {});
    });
}

function onCodeSessionDead() {
    sessionId = null;
    idsExecutedInSession = {};
    queue = [];
}

export function initCodeExecutor() {
    addListener( 'CODE_EXECUTION_REQUEST', onCodeExecutionRequest);
    addListener( 'CODE_EXECUTION_CHAIN_NEW_LINK', onCodeExecutionChainNewLink);
    addListener( 'CODE_SESSION_DEAD', onCodeSessionDead);
    addListener( 'CODE_EXECUTION_INPUT_PROVIDED', onCodeExecutionInputProvided);
}