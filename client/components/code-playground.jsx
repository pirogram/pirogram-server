import React from 'react';
import PropTypes from 'prop-types';
import CodeEditor from './code-editor.jsx';
import {Segment, Label, Icon, Form, Checkbox, Button} from 'semantic-ui-react';
import {ComponentNuxState, dispatch} from '../nux';
import uuid from 'uuid/v4';

export default class CodePlayground extends React.Component {
    constructor( props) {
        super( props);

        this.nuxState = new CodePlaygroundState( this);
        this.state = this.nuxState.state;
    }

    render() {
        return(
            <Segment className='code-playground'>
                <Label attached='top'>
                    <Icon name='code'/> Code Playground (Shift+Enter to Execute)
                </Label>
                <div className='runnable-code'>
                    <CodeEditor id={this.state.id} code={this.state.code} />
                </div>
                <div className='side-effects'>
                    {this.state.status == 'inprogress' ? <div className='ui active small inline loader'></div> : ''}
                    {this.state.status == 'failure' ? <div>There was an error in executing the code.</div> : ''}
                    {this.state.status == 'session-dead' ? <div>Cannot execute code. Please reload page and try.</div> : ''}

                    {this.state.sideEffects.map( (sideEffect, i) => {
                        if( sideEffect.stream == 'stdout' || sideEffect.stream == 'stderr') {
                            return <pre>{sideEffect.content}</pre>
                        } else if( sideEffect.stream == 'matplotlib') {
                            return <img className='ui image' src={'data:image/png;base64,' + sideEffect.content}/>
                        }
                    })}
                </div>
            </Segment>
        );
    }
}

CodePlayground.PropTypes = {
    id: PropTypes.string.isRequired,
    lang: PropTypes.string.isRequired,
    code: PropTypes.string.isRequired,
    userCode: PropTypes.string
};


class CodePlaygroundState extends ComponentNuxState {
    constructor(component) {
        super( component);
        this.state = Object.assign({}, this.state, {sideEffects: [], status: 'null', 
            code: this.state.userCode ? this.state.userCode : this.state.code})

        if( !this.state.id) {
            this.state.id = 'fake-' + uuid();
        }
    }

    onCodeExecutionSuccess( data) {
        if( data.playgroundId != this.state.id) { return; }

        this.setState(Object.assign({}, this.state, {status: 'success', sideEffects: data.sideEffects}));
    }

    onCodeExecutionFailure( data) {
        if( data.playgroundId != this.state.id) { return; }

        this.setState(Object.assign({}, this.state, {status: 'failure'}));
    }

    onCodeExecutionInProgress( data) {
        if( data.playgroundId != this.state.id) { return; }

        this.setState(Object.assign({}, this.state, {status: 'inprogress', sideEffects: []}));
    }

    onEditorCodeExecutionRequest( data) {
        if( data.editorId != this.state.id) { return; }

        dispatch('CODE_EXECUTION_REQUEST', {playgroundId: this.state.id, code: data.code});
    }

    onCodeSessionDead( data) {
        this.setState(Object.assign({}, this.state, {status: 'session-dead', sideEffects: []}));
    }
}