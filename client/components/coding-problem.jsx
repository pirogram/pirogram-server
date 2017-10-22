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
        this.onSubmit = this.onSubmit.bind(this);
    }

    onSubmit(e) {
    }

    render() {
        const buttonProps = {loading: this.state.loading ? true : false, 
            icon: this.state.done ? 'checkmark' : 'wait',
            content: this.state.done ? 'Done' : 'Check'};

        const submitButton = this.state.userId ?
            <Button size='small' primary labelPosition='left' {...buttonProps}/> :
            <a className="ui small button" href='/login'>Login with Google to try</a>

        return(
            <Segment className='coding-problem'>
                <Label attached='top'>
                    <Icon name={this.state.done ? 'checkmark':'wait'} className="exercise status"/>
                     Coding Problem (Shift+Enter to Execute)
                </Label>

                {this.state.problemStatement ? 
                    <div className='problem-statement'>
                        <HtmlContent html={this.state.problemStatement}/>
                    </div> : '' }

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

                <div className='tests'>
                    {this.state.tests.map( (test, i) => {
                        return <div className='test'>
                                <code><pre><HtmlContent html={test}/></pre></code>
                            </div>;
                    })}
                </div>

                <div className='submit'>
                    {submitButton}
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
        const code = this.state.userCode ? this.state.userCode : this.state.starterCode;
        this.state = Object.assign({}, this.state, {sideEffects: [], status: 'null', 
            code, currentCode: code});
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

    onEditorContentChange( data) {
        if( data.editorId != this.state.id) { return; }

        this.setState( Object.assign({}, this.state, {currentCode: data.content}));
    }
}