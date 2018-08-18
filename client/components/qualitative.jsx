import React from 'react';
import {without} from 'lodash';
import Parser from 'html-react-parser';
import PropTypes from 'prop-types';
import axios from 'axios';
import {Segment, Label, Icon, Form, Button, TextArea} from 'semantic-ui-react';
import {ComponentNuxState, dispatch} from '../nux';


export default class QualitativeQuestion extends React.Component {
    constructor(props) {
        super( props);
        this.nuxState = new QualitativeQuestionState( this);
        this.state = this.nuxState.state;
    }

    render() {
        const buttonProps = {loading: this.state.checkingAnswer ? true : false, 
            icon: this.state.done ? 'checkmark' : 'wait',
            content: this.state.done ? 'Marked As Done' : 'Mark As Done'};

        const submitButton = this.state.userId ?
                <Button size='small' primary type="submit" labelPosition='left' {...buttonProps}/> :
                <a className="ui small button" href='/login'>Login to try</a>
        
        return (
            <Segment>
                <Label attached='top'><Icon name={this.state.done ? 'checkmark':'wait'} className="exercise status"/>Exercise</Label>

                {Parser(this.state.question)}

                <Form className={this.state.serverError ? "quiz error" : "quiz"} 
                    onSubmit={(e) => { 
                        e.preventDefault();
                        dispatch( 'QUALITATIVE_QUESTION_ANSWERED', {exerciseId: this.state.id});
                    }}>
                    <Form.Group className="grouped fields">
                        <Form.Field className="field">
                            <TextArea style={{minHeight: 100}} autoHeight value={this.state.answer} 
                                onChange={(e, data) => {
                                    dispatch('QUALITATIVE_QUESTION_UPDATED', {exerciseId: this.state.id,
                                        answer: data.value});
                            }}/>
                        </Form.Field>
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


QualitativeQuestion.propTypes = {
    id: PropTypes.string.isRequired,
    question: PropTypes.string.isRequired,
    done: PropTypes.bool,
    answer: PropTypes.string
};


class QualitativeQuestionState extends ComponentNuxState {
    constructor( component) {
        super( component);
        this.state = {...this.state, checkingAnswer: false, answer: this.state.answer || '',
            serverError: false};
        component.state = this.state;
    }

    onQualitativeQuestionAnswered( data) {
        if( data.exerciseId != this.state.id) return;

        const self = this;

        axios.post('/exercise/' + self.state.id + '/solution', 
            {answer: this.state.answer})
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

        this.setState( Object.assign({}, this.state, {answer: data.answer}));
    }
}