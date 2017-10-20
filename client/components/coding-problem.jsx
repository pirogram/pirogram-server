import React from 'react';
import PropTypes from 'prop-types';
import CodeEditor from './code-editor.jsx';
import HtmlContent from './html-content.jsx';
import {Segment, Label, Icon, Form, Checkbox, Button} from 'semantic-ui-react';
import {ComponentNuxState, dispatch} from '../nux';
import uuid from 'uuid/v4';

export default class CodingProblem extends React.Component {
    constructor( props) {
        super( props);

        this.nuxState = new CodingProblemState( this);
        this.state = this.nuxState.state;
    }

    render() {
        return(
            <Segment className='coding-problem'>
                <Label attached='top'>
                    <Icon name='code'/> Coding Problem (Shift+Enter to Execute)
                </Label>

                {this.state.problemStatement ? <HtmlContent html={this.state.problemStatement}/> : ''}

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

CodingProblem.PropTypes = {
    id: PropTypes.string.isRequired,
    problemStatement: PropTypes.string.isRequired,
    starterCode: PropTypes.string.isRequired,
    referenceSolution: PropTypes.string.isRequired,
    tests: PropTypes.string.isRequired,
    userCode: PropTypes.string
};


class CodingProblemState extends ComponentNuxState {
    constructor(component) {
        super( component);
        this.state = Object.assign({}, this.state, {sideEffects: [], status: 'null', 
            code: this.state.userCode ? this.state.userCode : this.state.starterCode})
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

    onCodeSessionDead( data) {
        this.setState(Object.assign({}, this.state, {status: 'session-dead', sideEffects: []}));
    }
}