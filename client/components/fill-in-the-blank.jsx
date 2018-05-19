import React from 'react';
import Parser from 'html-react-parser';
import PropTypes from 'prop-types';
import axios from 'axios';
import {Segment, Label, Icon, Form, Button, Input, Message} from 'semantic-ui-react';
import {ComponentNuxState, dispatch} from '../nux';
import CodePlayground from './code-playground/index.jsx';


export default class FillInTheBlankQuestion extends React.Component {
    constructor(props) {
        super( props);
        this.nuxState = new FillInTheBlankQuestionState( this);
        this.state = this.nuxState.state;
        this.onExecute = this.onExecute.bind(this);
    }

    onExecute( code) {
        dispatch( 'CODE_EXECUTION_REQUEST', {code, playgroundId: this.props.compositeId});
    }

    render() {
        const buttonProps = {loading: this.state.checkingAnswer ? true : false, 
            icon: this.state.done ? 'checkmark' : 'wait',
            content: this.state.done ? 'Done' : 'Check'};

        const submitButton = this.state.userId ?
                <Button size='small' primary type="submit" labelPosition='left' {...buttonProps}/> :
                <a className="ui small button" href='/login'>Login to try</a>

        return (
            <Segment>
                <Label attached='top'><Icon name={this.state.done ? 'checkmark':'wait'} className="exercise status"/>Exercise</Label>

                {Parser(this.state.question)}

                {this.state.starterCode ? 
                    <div className='practise-area'>
                        <CodePlayground id={this.state.compositeId} userCode={this.state.userCode} 
                        starterCode={this.state.starterCode} 
                        chained={false} executeCmd={this.onExecute}/>
                    </div> : null}

                <Form className={this.state.serverError ? "quiz error" : "quiz"} 
                    onSubmit={(e) => { 
                        e.preventDefault();
                        fillInTheBlankAnswerCheck( this.state.id);
                    }}>
                    <Form.Group className="grouped fields">
                        {this.state.labels.map( (label, index) => {
                            const className = this.state.showHint && 
                                this.state.corrections[label] ? 'error' : '';

                            return <Form.Field key={index} className={className}>
                                        <label>{label}</label>
                                        <Input className="six wide field" placeholder='Answer' 
                                            value={this.state.answers[label] || ''}
                                            onChange={(e, data) => {
                                                dispatch('FILL_IN_THE_BLANK_VALUE_CHANGE', {exerciseId: this.state.id, label, answer: data.value});
                                            }}/>
                                        {this.state.showHint ? 
                                            <Label pointing='above' basic color='red'>
                                                {this.state.corrections[label]}</Label> : null}
                                    </Form.Field>
                        })}
                        <Form.Field className="field">
                            {submitButton}
                        </Form.Field>
                    </Form.Group>
                    {this.state.serverError ? 
                        <Message error size='tiny' content='There was an error communicatig with server.'/> : null}
                </Form>
            </Segment>
        )
    }
}

FillInTheBlankQuestion.propTypes = {
    id: PropTypes.string.isRequired,
    compositeId: PropTypes.string.isRequired,
    question: PropTypes.string.isRequired,
    starterCode: PropTypes.string,
    userCode: PropTypes.string,
    done: PropTypes.bool,
    labels: PropTypes.arrayOf( PropTypes.string),
    answers: PropTypes.arrayOf( PropTypes.string),
    userId: PropTypes.number
};


class FillInTheBlankQuestionState extends ComponentNuxState {
    constructor( component) {
        super( component);
        this.state.answers = this.state.answers || {};
        this.state.corrections = this.state.corrections || {};
        this.state = {...this.state, showHint: false, checkingAnswer: false, 
                hintTimer: null, serverError: false};
        component.state = this.state;
    }


    clearHint() {
        if( this.state.showHint) {
            this.setState( Object.assign({}, this.state, {showHint: false}));
        }
    }


    onFillInTheBlankAnswerCheck( data) {
        if( data.exerciseId != this.state.id) return;

        const self = this;

        axios.post('/exercise/' + self.state.compositeId + '/solution', 
            {answers: this.state.answers})
        .then(function(response) {
            const solutionIsCorrect = response.data.solutionIsCorrect;
            self.state = Object.assign({}, self.state, {checkingAnswer: false, 
                done: solutionIsCorrect, 
                corrections: response.data.corrections || {}});
            if( !solutionIsCorrect) {
                self.state = Object.assign({}, self.state, {showHint: true});
                setTimeout( () => { self.clearHint(); }, 3000);
                self.updateState();
            } else {
                self.updateState();
            }
        }).catch(function(e) {
            self.setState( Object.assign({}, self.state, {checkingAnswer: false, serverError: true}));
        });

        this.setState( Object.assign({}, this.state, {checkingAnswer: true, showHint: false, 
            serverError: false}));
    }


    onFillInTheBlankValueChange( data) {
        if( data.exerciseId != this.state.id) return;

        const answers = Object.assign({}, this.state.answers);
        answers[data.label] = data.answer;
        this.setState( Object.assign({}, this.state, {answers}));
    }

    onEditorContentChange(data) {
        if( data.editorId != this.state.compositeId) { return; }
        
        this.setState(Object.assign({}, this.state, {userCode: data.content}));
    }
}


function fillInTheBlankAnswerCheck( exerciseId) {
    dispatch( 'FILL_IN_THE_BLANK_ANSWER_CHECK', { exerciseId });
}