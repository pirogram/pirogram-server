import React from 'react';
import Parser from 'html-react-parser';
import PropTypes from 'prop-types';
import axios from 'axios';
import {Segment, Label, Icon, Form, Button, Dropdown} from 'semantic-ui-react';
import {ComponentNuxState, dispatch} from '../nux';
import CodePlayground from './code-playground/index.jsx';


export default class CategorizationQuestion extends React.Component {
    constructor(props) {
        super( props);
        this.nuxState = new CategorizationQuestionState( this);
        this.state = this.nuxState.state;
        this.onExecute = this.onExecute.bind(this);
    }

    onExecute( code) {
        dispatch( 'CODE_EXECUTION_REQUEST', {code, playgroundId: this.props.id, viewOnly: this.props.viewOnly});
    }

    render() {
        const buttonProps = {loading: this.state.checkingAnswer ? true : false, 
            icon: this.state.done ? 'checkmark' : 'wait',
            content: this.state.done ? 'Done' : 'Check'};

        const submitButton = this.state.userId ?
                <Button size='small' primary type="submit" labelPosition='left' {...buttonProps}/> :
                <a className="ui small button" href='/login'>Login to try</a>

        const dropdownValues = this.state.categories.map( (category, index) => {
            return {text: category, value: category};
        });

        return (
            <Segment id={this.state.id} className='exercise'>
                <Label attached='top'>
                    <a href={'#' + this.state.id}><Icon name={this.state.done ? 'checkmark':'wait'} className="exercise status"/>Exercise {this.state.index}</a>
                </Label>

                {Parser(this.state.question)}

                {this.state.starterCode ? 
                    <div className='practise-area'>
                        <CodePlayground id={this.state.id} userCode={this.state.userCode} 
                        starterCode={this.state.starterCode} 
                        chained={false} executeCmd={this.onExecute}/>
                    </div> : null}

                <Form className={this.state.serverError ? "quiz error" : "quiz"}
                    onSubmit={(e) => { 
                        e.preventDefault();
                        categorizationAnswerCheck( this.state.id);
                    }}>
                    <Form.Group className="grouped fields">
                        {this.state.challenges.map( (challenge, index) => {
                            const className = this.state.showHint && 
                                this.state.selectedCategories[challenge] != 
                                    this.state.correctCategories[challenge] ? 'error' : '';

                            return <Form.Field width={8} key={index} className={className}>
                                        <label>{challenge}</label>
                                        <Dropdown placeholder='Select' selection options={dropdownValues}
                                            value={this.state.selectedCategories[challenge] || ''}
                                            onChange={(e, data) => {
                                                dispatch('CATEGORY_SELECTED', {exerciseId: this.state.id, challenge: challenge, category: data.value});
                                            }}/>
                                        {this.state.showHint && 
                                            this.state.selectedCategories[challenge] != 
                                                this.state.correctCategories[challenge] ?
                                            <Label pointing='above' basic color='red'>
                                                {this.state.correctCategories[challenge]}</Label> : null}
                                    </Form.Field>
                        })}
                        <Form.Field className="field">
                            {this.state.viewOnly ? '' :
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

CategorizationQuestion.propTypes = {
    id: PropTypes.string.isRequired,
    question: PropTypes.string.isRequired,
    starterCode: PropTypes.string,
    userCode: PropTypes.string,
    done: PropTypes.bool,
    categories: PropTypes.arrayOf( PropTypes.string),
    challenges: PropTypes.arrayOf( PropTypes.string),
    selectedCategories: PropTypes.arrayOf( PropTypes.shape( {
        challenge: PropTypes.string,
        category: PropTypes.string
    })),
    correctCategories: PropTypes.arrayOf( PropTypes.shape( {
        challenge: PropTypes.string,
        category: PropTypes.string
    })),
    userId: PropTypes.number
};


class CategorizationQuestionState extends ComponentNuxState {
    constructor( component) {
        super( component);
        this.state.selectedCategories = this.state.selectedCategories || {};
        this.state.correctCategories = this.state.correctCategories || {};
        this.state = {...this.state, showHint: false, checkingAnswer: false, hintTimer: null,
            serverError: false};
        component.state = this.state;
    }


    clearHint() {
        if( this.state.showHint) {
            this.setState( Object.assign({}, this.state, {showHint: false}));
        }
    }


    onCategorizationAnswerCheck( data) {
        if( data.exerciseId != this.state.id) return;

        const self = this;

        axios.post('/exercise/' + self.state.id + '/solution', 
            {selectedCategories: this.state.selectedCategories})
        .then(function(response) {
            const solutionIsCorrect = response.data.solutionIsCorrect;
            self.state = Object.assign({}, self.state, {checkingAnswer: false, done: solutionIsCorrect});
            if( !solutionIsCorrect) {
                self.state = Object.assign({}, self.state, 
                    {correctCategories: response.data.correctCategories, showHint: true});
                setTimeout( () => { self.clearHint(); }, 3000);
                self.updateState();
            } else {
                self.updateState();
            }
        }).catch(function() {
            self.setState( Object.assign({}, self.state, {checkingAnswer: false, serverError: true}));
        });

        this.setState( Object.assign({}, this.state, {checkingAnswer: true, showHint: false, serverError: false}));
    }


    onCategorySelected( data) {
        if( data.exerciseId != this.state.id) return;

        const newSelectedCategories = Object.assign({}, this.state.selectedCategories);
        newSelectedCategories[data.challenge] = data.category;

        this.setState( Object.assign({}, this.state, {selectedCategories: newSelectedCategories}));
    }

    onEditorContentChange(data) {
        if( data.editorId != this.state.id) { return; }
        
        this.setState(Object.assign({}, this.state, {userCode: data.content}));
    }
}


function categorizationAnswerCheck( exerciseId) {
    dispatch( 'CATEGORIZATION_ANSWER_CHECK', { exerciseId });
}