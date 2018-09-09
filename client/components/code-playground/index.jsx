import React from 'react';
import PropTypes from 'prop-types';
import CodeEditor from './code-editor.jsx';
import CodeOutput from './code-output.jsx';
import CodeInput from './code-input.jsx';
import CodeTests from './code-tests.jsx';
import CodeStatus from './code-status.jsx';
import {ComponentNuxState} from '../../nux.js';

export default class CodePlayground extends React.Component {
    constructor( props) {
        super( props);

        this.nuxState = new CodePlaygroundState( this);
        this.state = this.nuxState.state;
    }

    render() {
        return (
            <div className='code-playground'>
                <CodeEditor id={this.state.id} code={this.state.code} executeCmd={this.props.executeCmd} 
                    starterCode={this.state.starterCode} loading={this.state.loading}/>

                <CodeTests tests={this.state.tests} />
                <CodeOutput output={this.state.output} />
                {this.state.needInput ? <CodeInput id={this.state.id}/> : null}
                <CodeStatus status={this.state.status} />
            </div>
        );
    }
}

CodePlayground.PropTypes = {
    id: PropTypes.string.isRequired,
    starterCode: PropTypes.string.isRequired,
    userCode: PropTypes.string,
    tests: PropTypes.arrayOf( PropTypes.string),
    executeCmd: PropTypes.func.isRequired
};

class CodePlaygroundState extends ComponentNuxState {
    constructor(component) {
        super( component);
        this.state = Object.assign({}, this.state, {output: [], loading: false,
            status: null, needInput: false});

        try {
            if( window && window.localStorage) {
                this.state.storedCode = window.localStorage.getItem(`editor-${this.state.id}`);
            }
        } catch(e) {}

        this.state.code = this.state.storedCode || this.state.userCode || this.state.starterCode;
    }

    onCodeExecutionSuccess( data) {
        if( data.playgroundId != this.state.id) { return; }

        const newState = Object.assign({}, this.state, {status: 'success', loading: false, 
            output: this.state.output.concat(data.output), needInput: false});
        if(!data.hasError) {
            newState.tests = data.testResults;
        }

        try {
            if( window && window.localStorage) {
                window.localStorage.removeItem(`editor-${data.playgroundId}`);
                newState.storedCode = null;
            }
        } catch(e) {}

        this.setState(newState);
    }

    onCodeExecutionNeedInput(data) {
        if( data.playgroundId != this.state.id) { return; }

        const newState = Object.assign({}, this.state, {status: 'awaiting_input', loading: false, 
            output: this.state.output.concat(data.output), needInput: true});

        this.setState(newState);
    }

    onCodeExecutionInputProvided(data) {
        if( data.playgroundId != this.state.id) { return; }
        
        const newOutput = this.state.output;
        if( newOutput.length == 0 || newOutput[newOutput.length-1].name != 'stdout') {
            newOutput.push({name: 'stdout', text: data.inputValue});
        } else {
            const lastOutput = newOutput[newOutput.length - 1];
            lastOutput.text = lastOutput.text + data.inputValue;
        }

        const newState = Object.assign({}, this.state, {status: 'inprogress', loading: true, 
            output: newOutput, needInput: false});

        this.setState(newState);
    }

    onCodeExecutionFailure( data) {
        if( data.playgroundId != this.state.id) { return; }

        this.setState(Object.assign({}, this.state, {status: 'failure', loading: false, 
            tests: this.component.props.tests, needInput: false}));
    }

    onCodeExecutionInProgress( data) {
        if( data.playgroundId != this.state.id) { return; }

        this.setState(Object.assign({}, this.state, {status: 'inprogress', loading: true, output: [], tests: this.component.props.tests, needInput: false}));
    }

    onCodeExecutionQueued( data) {
        if( data.playgroundId != this.state.id) { return; }

        this.setState(Object.assign({}, this.state, {status: 'queued', loading: true, output: [], tests: this.component.props.tests}));
    }

    onCodeSessionDead( data) {
        if( this.state.status == 'inprogress' || this.state.status == 'queued') {
            this.setState(Object.assign({}, this.state, {status: 'session-dead', loading: false, needInput: false}));
        }
    }

    onCodeExecutionRequiresLogin( data) {
        if( data.playgroundId != this.state.id) { return; }

        this.setState(Object.assign({}, this.state, {status: 'require-login', loading: false}));
    }

    onEditorContentChange(data) {
        if( data.editorId != this.state.id
            || data.content == this.state.storedCode
            || data.content == this.state.userCode
            || data.content == this.state.starterCode) return;

        try {
            if( window && window.localStorage) {
                window.localStorage.setItem(`editor-${data.editorId}`, data.content);
                this.state.storedCode = data.content;
                this.state.code = data.content;
                this.updateState();
            }
        } catch(e) {}
    }
}