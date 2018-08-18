import React from 'react';
import Parser from 'html-react-parser';
import PropTypes from 'prop-types';
import axios from 'axios';
import {Segment, Label, Icon, Form, Button, TextArea} from 'semantic-ui-react';
import CodePlayground from './code-playground/index.jsx';
import {ComponentNuxState, dispatch} from '../nux';


export default class TestlessCodingProblem extends React.Component {
    constructor(props) {
        super( props);
        this.nuxState = new TestlessCodingProblemState( this);
        this.state = this.nuxState.state;

        this.onExecute = this.onExecute.bind(this);

        if( this.props.chained) {
            dispatch( 'CODE_EXECUTION_CHAIN_NEW_LINK', {codeExplorer: this});
        }
    }

    onExecute( code) {
        dispatch( 'CODE_EXECUTION_REQUEST', {code, playgroundId: this.props.id, 
            chained: this.props.chained});
        
        this.state.answer = code;
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

                <div className='practise-area'>
                    <CodePlayground id={this.props.id} userCode={this.props.userCode} 
                        starterCode={this.props.starterCode} userId={this.props.userId}
                        chained={this.props.chained} executeCmd={this.onExecute}/>
                </div>

                <Form className={this.state.serverError ? "quiz error" : "quiz"} 
                    onSubmit={(e) => { 
                        e.preventDefault();
                        dispatch( 'QUALITATIVE_QUESTION_ANSWERED', {exerciseId: this.state.id});
                    }}>
                    <Form.Group className="grouped fields">
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


TestlessCodingProblem.propTypes = {
    id: PropTypes.string.isRequired,
    question: PropTypes.string.isRequired,
    done: PropTypes.bool,
    chained: PropTypes.bool,
    userCode: PropTypes.string.isRequired,
    starterCode: PropTypes.string
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
            {code: this.state.answer})
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