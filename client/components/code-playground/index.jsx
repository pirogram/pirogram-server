import React from 'react';
import PropTypes from 'prop-types';
import CodeEditor from './code-editor.jsx';
import CodeOutput from './code-output.jsx';
import CodeTests from './code-tests.jsx';
import CodeStatus from './code-status.jsx';
import {ComponentNuxState, dispatch} from '../../nux.js';

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
        this.state = Object.assign({}, this.state, {output: [], status: 'null', loading: false,
            code: this.state.userCode ? this.state.userCode : this.state.starterCode})
    }

    onCodeExecutionSuccess( data) {
        if( data.playgroundId != this.state.id) { return; }

        const newState = Object.assign({}, this.state, {status: 'success', loading: false, output: data.output});
        if(!data.hasError) {
            newState.tests = data.testResults;
        }

        this.setState(newState);
    }

    onCodeExecutionFailure( data) {
        if( data.playgroundId != this.state.id) { return; }

        this.setState(Object.assign({}, this.state, {status: 'failure', loading: false, tests: this.component.props.tests}));
    }

    onCodeExecutionInProgress( data) {
        if( data.playgroundId != this.state.id) { return; }

        this.setState(Object.assign({}, this.state, {status: 'inprogress', loading: true, output: [], tests: this.component.props.tests}));
    }

    onCodeSessionDead( data) {
        this.setState(Object.assign({}, this.state, {status: 'session-dead', loading: false}));
    }

    onCodeExecutionRequiresLogin( data) {
        if( data.playgroundId != this.state.id) { return; }

        this.setState(Object.assign({}, this.state, {status: 'require-login', loading: false}));
    }
}