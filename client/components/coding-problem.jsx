import React from 'react';
import PropTypes from 'prop-types';
import CodePlayground from './code-playground/index.jsx';
import HtmlContent from './html-content.jsx';
import {Segment, Label, Icon, Button} from 'semantic-ui-react';
import {ComponentNuxState, dispatch} from '../nux';

export default class CodingProblem extends React.Component {
    constructor( props) {
        super( props);

        this.nuxState = new CodingProblemState( this);
        this.state = this.nuxState.state;
        this.onExecute = this.onExecute.bind(this);
    }

    onExecute( code) {
        dispatch( 'CODE_EXECUTION_REQUEST', {code, playgroundId: this.state.id, 
            route: 'exercise', viewOnly: this.props.viewOnly});
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
            <Segment id={this.state.id} className='coding-problem exercise'>
                <Label attached='top'>
                    <a href={'#' + this.state.id}><Icon name={this.state.done ? 'checkmark':'wait'} className="exercise status"/>Exercise {this.state.index}</a>
                </Label>

                {this.state.question ? 
                    <div className='problem-statement'>
                        <HtmlContent html={this.state.question}/>
                    </div> : '' }

                <CodePlayground id={this.state.id} starterCode={this.state.starterCode} userCode={this.state.userCode}
                    tests={this.state.tests} executeCmd={this.onExecute}/>

                {this.state.viewOnly ? '' :
                    <div className='submit'>
                        {submitButton}
                    </div>}
            </Segment>
        );
    }
}

CodingProblem.PropTypes = {
    id: PropTypes.string.isRequired,
    question: PropTypes.string.isRequired,
    starterCode: PropTypes.string.isRequired,
    tests: PropTypes.string.isRequired,
    userCode: PropTypes.string,
    done: PropTypes.bool,
    viewOnly: PropTypes.bool
};

class CodingProblemState extends ComponentNuxState {
    constructor(component) {
        super( component);
        this.state = Object.assign({}, this.state, {loading: false, failedAttempts: 0});
    }
    
    onCodeExecutionSuccess( data) {
        if( data.playgroundId != this.state.id) { return; }

        const newState = Object.assign({}, this.state, {loading: false, done: data.solutionIsCorrect});
        if( !data.solutionIsCorrect) {
            newState.failedAttempts += 1;
        }

        this.setState( newState);
    }

    onCodeExecutionFailure( data) {
        if( data.playgroundId != this.state.id) { return; }

        this.setState(Object.assign({}, this.state, {loading: false}));
    }

    onCodeExecutionInProgress( data) {
        if( data.playgroundId != this.state.id) { return; }

        this.setState(Object.assign({}, this.state, {loading: true}));
    }

    onEditorContentChange( data) {
        if( data.editorId != this.state.id) { return ; }

        this.setState(Object.assign({}, this.state, {currentCode: data.content}));
    }
}