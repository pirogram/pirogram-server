import React from 'react';
import PropTypes from 'prop-types';
import Parser from 'html-react-parser';
import CodePlayground from '../code-playground/index.jsx';
import {Segment, Label, Icon, Button} from 'semantic-ui-react';
import {ComponentNuxState, dispatch} from '../../nux';

export default class CodingProblem extends React.Component {
    constructor( props) {
        super( props);

        this.nuxState = new CodingProblemState( this);
        this.state = this.nuxState.state;
        this.onExecute = this.onExecute.bind(this);
    }

    onExecute( code) {
        dispatch( 'CODE_EXECUTION_REQUEST', {code, testLines: this.props.testLines, playgroundId: this.state.id, 
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

        const submitButton = this.props.userId ?
            <Button size='small' primary labelPosition='left' {...buttonProps}/> :
            <a className="ui small button" href='/login'>Login to try</a>

        return(
            <Segment id={this.props.id} className='exercise'>
                <Label attached='top'>
                    {this.props.viewOnly ? '' : 
                        this.props.solutionCount ? 
                            <a href={'/activities?exercise_id=' + this.props.id} style={{float: 'right', fontWeight: 'normal'}}>view {this.props.solutionCount} {this.props.solutionCount == 1 ? 'solution' : 'solutions'}</a>
                            : <span style={{float: 'right', fontWeight: 'normal'}}>0 solutions available</span>}

                    <a href={'#' + this.props.id}><Icon name={this.state.done ? 'checkmark':'wait'} className="exercise status"/>Exercise {this.props.index}</a>
                </Label>
                
                {Parser(this.props.questionHtml)}

                <CodePlayground id={this.props.id} starterCode={this.props.starterCode} userCode={this.state.userCode}
                    testsHtml={this.props.testsHtml} executeCmd={this.onExecute}/>

                {this.props.viewOnly ? '' :
                    <div className='submit'>
                        {submitButton}
                    </div>}
            </Segment>
        );
    }
}

CodingProblem.PropTypes = {
    id: PropTypes.string.isRequired,
    questionHtml: PropTypes.string.isRequired,
    starterCode: PropTypes.string.isRequired,
    testLines: PropTypes.arrayOf( PropTypes.string),
    testsHtml: PropTypes.arrayOf( PropTypes.string),
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