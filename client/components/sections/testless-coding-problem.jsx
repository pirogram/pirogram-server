import React from 'react';
import Parser from 'html-react-parser';
import PropTypes from 'prop-types';
import axios from 'axios';
import {Segment, Label, Icon, Form, Button} from 'semantic-ui-react';
import CodePlayground from '../code-playground/index.jsx';
import {ComponentNuxState, dispatch} from '../../nux';


export default class TestlessCodingProblem extends React.Component {
    constructor(props) {
        super( props);
        this.nuxState = new TestlessCodingProblemState( this);
        this.state = this.nuxState.state;

        this.onExecute = this.onExecute.bind(this);
    }

    onExecute( code) {
        dispatch( 'CODE_EXECUTION_REQUEST', {code, playgroundId: this.props.id, 
            viewOnly: this.props.viewOnly});
        
        this.state.answer = code;
    }

    render() {
        const buttonProps = {loading: this.state.checkingAnswer ? true : false, 
            icon: this.state.done ? 'checkmark' : 'wait',
            content: this.state.done ? 'Marked As Done' : 'Mark As Done'};

        const submitButton = this.props.userId ?
                <Button size='small' primary type="submit" labelPosition='left' {...buttonProps}/> :
                <a className="ui small button" href='/login'>Login to try</a>
        
        return (
            <Segment id={this.props.id} className='exercise'>
                <Label attached='top'>
                    {this.props.viewOnly ? '' : 
                        this.props.solutionCount ? 
                            <a href={'/activities?exercise_id=' + this.props.id} style={{float: 'right', fontWeight: 'normal'}}>view {this.props.solutionCount} {this.props.solutionCount == 1 ? 'solution' : 'solutions'}</a>
                            : <span style={{float: 'right', fontWeight: 'normal'}}>0 solutions available</span>}

                    <a href={'#' + this.props.id}><Icon name={this.state.done ? 'checkmark':'wait'} className="exercise status"/>Exercise {this.props.index}</a>
                </Label>

                {Parser(this.props.questionHtml)}

                <CodePlayground id={this.props.id} userCode={this.props.userCode} 
                    starterCode={this.props.starterCode} userId={this.props.userId}
                    chained={this.props.chained} executeCmd={this.onExecute}/>

                <Form className={this.state.serverError ? "quiz error" : "quiz"} 
                    onSubmit={(e) => { 
                        e.preventDefault();
                        dispatch( 'QUALITATIVE_QUESTION_ANSWERED', {exerciseId: this.props.id});
                    }}>
                    <Form.Group className="grouped fields">
                        <Form.Field className="field">
                            {this.props.viewOnly ? '' :
                                <div className='submit'>
                                    {submitButton}
                                </div>}
                        </Form.Field>
                    </Form.Group>
                    {this.state.serverError ? 
                        <Message error size='tiny' content='There was an error communicatig with server.'/> : null}
                </Form>
            </Segment>
        )
    }
}


TestlessCodingProblem.propTypes = {
    id: PropTypes.string.isRequired,
    questionHtml: PropTypes.string.isRequired,
    done: PropTypes.bool,
    chained: PropTypes.bool,
    userCode: PropTypes.string,
    starterCode: PropTypes.string,
    solutionCount: PropTypes.number
};


class TestlessCodingProblemState extends ComponentNuxState {
    constructor( component) {
        super( component);
        this.state = {...this.state, checkingAnswer: false, answer: this.state.answer || '',
            serverError: false, userCode: this.state.userCode || this.state.starterCode};
        component.state = this.state;
    }

    onQualitativeQuestionAnswered( data) {
        if( data.exerciseId != this.state.id) return;

        const self = this;

        axios.post('/exercise/' + self.state.id + '/solution', 
            {code: this.state.userCode})
        .then(function(response) {
            self.state = Object.assign({}, self.state, {checkingAnswer: false, done: true});
            self.updateState();
        }).catch(function() {
            self.setState( Object.assign({}, self.state, {checkingAnswer: false, serverError: true}));
        });

        this.setState( Object.assign({}, this.state, {checkingAnswer: true, serverError: false}));
    }

    onQualitativeQuestionUpdated( data) {
        if( data.exerciseId != this.state.id) return;

        this.setState( Object.assign({}, this.state, {code: data.answer}));
    }

    onEditorContentChange(data) {
        if( data.editorId != this.state.id) { return; }
        
        this.setState(Object.assign({}, this.state, {userCode: data.content}));
    }
}