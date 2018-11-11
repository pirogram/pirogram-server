import React from 'react';
import {without} from 'lodash';
import Parser from 'html-react-parser';
import PropTypes from 'prop-types';
import axios from 'axios';
import {Segment, Label, Icon, Form, Checkbox, Button} from 'semantic-ui-react';
import {ComponentNuxState, dispatch} from '../nux';
import CodePlayground from './code-playground/index.jsx';


export default class MultipleChoice extends React.Component {
    constructor(props) {
        super( props);
        this.nuxState = new MultipleChoiceState( this);
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
                        multipleChoiceAnswerCheck( this.state.id);
                    }}>
                    <Form.Group className="grouped fields">
                        {this.state.options.map( (option, i) => {
                            const checkedProps = this.state.selectedIds.indexOf( option.id) >= 0 ? 
                                                    {checked: true} : {};

                            return <Form.Field className={this.state.showHint && this.state.selectedIds.includes(option.id) != this.state.correctIds.includes(option.id) ? 'error' : ''}
                                        key={option.id}>
                                        <Checkbox name={'' + option.id} label={Parser(option.html)} 
                                            {...checkedProps} onChange={(e, data) => {
                                                const action = data.checked ? multipleChoiceOptionSelect : multipleChoiceOptionUnselect;
                                                action( this.state.id, option.id);
                                            }}/>
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


MultipleChoice.propTypes = {
    id: PropTypes.string.isRequired,
    question: PropTypes.string.isRequired,
    done: PropTypes.bool,
    options: PropTypes.arrayOf( PropTypes.shape({
        id: PropTypes.string.isRequired,
        html: PropTypes.string.isRequired
    })),
    correctIds: PropTypes.arrayOf( PropTypes.string),
    selectedIds: PropTypes.arrayOf( PropTypes.string),
    userId: PropTypes.number
};


class MultipleChoiceState extends ComponentNuxState {
    constructor( component) {
        super( component);
        this.state.selectedIds = this.state.selectedIds || [];
        this.state = {...this.state, showHint: false, checkingAnswer: false, hintTimer: null,
            serverError: false};
        component.state = this.state;
    }


    clearHint() {
        if( this.state.showHint) {
            this.setState( Object.assign({}, this.state, {showHint: false}));
        }
    }


    onMultipleChoiceAnswerCheck( data) {
        if( data.exerciseId != this.state.id) return;

        const self = this;

        axios.post('/exercise/' + self.state.id + '/solution', {selectedIds: this.state.selectedIds})
        .then(function(response) {
            const solutionIsCorrect = response.data.solutionIsCorrect;
            self.state = Object.assign({}, self.state, {checkingAnswer: false, done: solutionIsCorrect});
            if( !solutionIsCorrect) {
                self.state = Object.assign({}, self.state, {correctIds: response.data.correctIds.sort(),
                    selectedIds: self.state.selectedIds.sort(), showHint: true});
                setTimeout( () => { self.clearHint(); }, 3000);
                self.updateState();
            } else {
                self.updateState();
            }
        }).catch(function() {
            self.setState( Object.assign({}, self.state, {checkingAnswer: false, serverError: true}));
        });

        this.setState( Object.assign({}, this.state, {checkingAnswer: true, showHint: false, 
            serverError: false}));
    }


    onMultipleChoiceOptionSelect( data) {
        if( data.exerciseId != this.state.id) return;

        if( this.state.selectedIds.indexOf( data.optionId) == -1) {
            this.state = {...this.state, selectedIds: this.state.selectedIds.concat( data.optionId)};
            this.updateState();
        }
    }


    onMultipleChoiceOptionUnselect( data) {
        if( data.exerciseId != this.state.id) return;

        this.state = {...this.state, selectedIds: without( this.state.selectedIds, data.optionId)};
        this.updateState();
    }

    onEditorContentChange(data) {
        if( data.editorId != this.state.id) { return; }
        
        this.setState(Object.assign({}, this.state, {userCode: data.content}));
    }
}


function multipleChoiceAnswerCheck( exerciseId) {
    dispatch( 'MULTIPLE_CHOICE_ANSWER_CHECK', { exerciseId });
}


function multipleChoiceOptionSelect( exerciseId, optionId) {
    dispatch( 'MULTIPLE_CHOICE_OPTION_SELECT', { exerciseId, optionId });
}


function multipleChoiceOptionUnselect( exerciseId, optionId) {
    dispatch( 'MULTIPLE_CHOICE_OPTION_UNSELECT', { exerciseId, optionId });
}