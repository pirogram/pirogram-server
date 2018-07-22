import React from 'react';
import PropTypes from 'prop-types';
import CodePlayground from './code-playground/index.jsx';
import HtmlContent from './html-content.jsx';
import {Modal, Segment, Label, Icon, Form, Checkbox, Button} from 'semantic-ui-react';
import {ComponentNuxState, dispatch} from '../nux';

class CodingSolution extends React.Component {
    constructor( props) {
        super( props);

        this.state = {showSolution: false};
        this.showSolutionWindow = this.showSolutionWindow.bind(this);
        this.hideSolutionWindow = this.hideSolutionWindow.bind(this);
    }

    showSolutionWindow(e) {
        e.preventDefault();
        this.setState(Object.assign({}, this.state, {showSolution: true}));
    }

    hideSolutionWindow(e) {
        e.preventDefault();
        this.setState(Object.assign({}, this.state, {showSolution: false}));
    }

    render() {
        let message = null;
        if( this.state.showSolution) {
            message = <Modal dimmer='blurring' open={true}>
                <Modal.Header>Solution</Modal.Header>
                <Modal.Content>
                    <Modal.Description>
                        <code><pre><HtmlContent html={this.props.solution}/></pre></code>
                    </Modal.Description>
                </Modal.Content>
                <Modal.Actions>
                    <Button primary onClick={this.hideSolutionWindow}>
                        Ok
                    </Button>
                </Modal.Actions>
            </Modal>;
        } else if( this.props.failedAttempts > 0 && this.props.failedAttempts < 3) {
            const tries = (3-this.props.failedAttempts) == 1 ? 'try' : 'tries';
            message = <span className='failed-attempts'>Solution Available after {3-this.props.failedAttempts} more {tries}.</span>;
        } else if( this.props.failedAttempts >= 3) {
            message = <a className="ui small button solution" href='#' onClick={this.showSolutionWindow}>Solution</a>;
        }

        return message;
    }
}

export default class CodingProblem extends React.Component {
    constructor( props) {
        super( props);

        this.nuxState = new CodingProblemState( this);
        this.state = this.nuxState.state;
        this.onExecute = this.onExecute.bind(this);
    }

    onExecute( code) {
        dispatch( 'CODE_EXECUTION_REQUEST', {code, playgroundId: this.state.compositeId, 
            route: 'exercise', compositeId: this.state.compositeId});
    }

    render() {
        const buttonProps = {loading: this.state.loading ? true : false, 
            content: this.state.done ? 'Done' : 'Run Code'};

        if( this.state.loading) { buttonProps.icon = 'spinner'; }
        else if( this.state.done) { buttonProps.icon = 'checkmark'; }
        else { buttonProps.icon = 'wait'; }

        buttonProps.onClick = (e) => {
            e.preventDefault();
            this.onExecute( this.state.currentCode);
        }

        const submitButton = this.state.userId ?
            <Button size='small' primary labelPosition='left' {...buttonProps}/> :
            <a className="ui small button" href='/login'>Login to try</a>

        return(
            <Segment className='coding-problem'>
                <Label attached='top'>
                    <Icon name={this.state.done ? 'checkmark':'wait'} className="exercise status"/>
                     Coding Problem (Shift+Enter to Execute)
                </Label>

                {this.state.question ? 
                    <div className='problem-statement'>
                        <HtmlContent html={this.state.question}/>
                    </div> : '' }

                <CodePlayground id={this.state.compositeId} starterCode={this.state.starterCode} userCode={this.state.userCode}
                    tests={this.state.tests} executeCmd={this.onExecute}/>

                <div className='submit'>
                    {submitButton}
                    {this.props.referenceSolution && !this.state.done ? 
                        <CodingSolution failedAttempts={this.state.failedAttempts} solution={this.state.referenceSolution} /> : null}
                </div>
            </Segment>
        );
    }
}

CodingProblem.PropTypes = {
    id: PropTypes.string.isRequired,
    compositeId: PropTypes.string.isRequired,
    question: PropTypes.string.isRequired,
    starterCode: PropTypes.string.isRequired,
    referenceSolution: PropTypes.string.isRequired,
    tests: PropTypes.string.isRequired,
    userCode: PropTypes.string,
    done: PropTypes.bool
};

class CodingProblemState extends ComponentNuxState {
    constructor(component) {
        super( component);
        this.state = Object.assign({}, this.state, {loading: false, failedAttempts: 0});
    }
    
    onCodeExecutionSuccess( data) {
        if( data.playgroundId != this.state.compositeId) { return; }

        const newState = Object.assign({}, this.state, {loading: false, done: data.solutionIsCorrect});
        if( !data.solutionIsCorrect) {
            newState.failedAttempts += 1;
        }

        this.setState( newState);
    }

    onCodeExecutionFailure( data) {
        if( data.playgroundId != this.state.compositeId) { return; }

        this.setState(Object.assign({}, this.state, {loading: false}));
    }

    onCodeExecutionInProgress( data) {
        if( data.playgroundId != this.state.compositeId) { return; }

        this.setState(Object.assign({}, this.state, {loading: true}));
    }

    onEditorContentChange( data) {
        if( data.editorId != this.state.compositeId) { return ; }

        this.setState(Object.assign({}, this.state, {currentCode: data.content}));
    }
}