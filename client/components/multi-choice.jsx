import React from 'react';
import {without} from 'lodash';
import Parser from 'html-react-parser';
import PropTypes from 'prop-types';
import axios from 'axios';
import {Segment, Label, Icon, Form, Checkbox, Button} from 'semantic-ui-react';
import {ComponentNuxState, dispatch} from '../nux';


export default class MultipleChoice extends React.Component {
    constructor(props) {
        super( props);
        this.nuxState = new MultipleChoiceState( this);
        this.state = this.nuxState.state;
    }

    render() {
        const buttonProps = {loading: this.state.checkingAnswer ? true : false, 
            icon: this.state.done ? 'checkmark' : 'wait',
            content: this.state.done ? 'Done' : 'Check'};

        const submitButton = this.state.userId ?
                <Button size='small' primary type="submit" labelPosition='left' {...buttonProps}/> :
                <a className="ui small button" href='/login'>Login with Google to try</a>
        
        return (
            <Segment>
                <Label attached='top'><Icon name={this.state.done ? 'checkmark':'wait'} className="exercise status"/>Exercise</Label>

                {Parser(this.state.question)}

                <Form className="quiz" onSubmit={(e) => { 
                        e.preventDefault();
                        multipleChoiceAnswerCheck( this.state.id);
                    }}>
                    <Form.Group className="grouped fields">
                        {this.state.choiceOptions.map( (choiceOption, i) => {
                            const checkedProps = this.state.selectedIds.indexOf( choiceOption.id) >= 0 ? {checked: true} : {};

                            return <Form.Field className={this.state.showHint && this.state.selectedIds.indexOf(choiceOption.id) != this.state.correctIds.indexOf(choiceOption.id) ? 'error' : ''}
                                        key={choiceOption.id}>
                                        <Checkbox name={'' + choiceOption.id} label={Parser(choiceOption.html)} 
                                            {...checkedProps} onChange={(e, data) => {
                                                const action = data.checked ? multipleChoiceOptionSelect : multipleChoiceOptionUnselect;
                                                action( this.state.id, choiceOption.id);
                                            }}/>
                                    </Form.Field>
                        })}
                        <Form.Field className="field">
                            {submitButton}
                        </Form.Field>
                    </Form.Group>
                </Form>
            </Segment>
        )
    }
}


MultipleChoice.propTypes = {
    id: PropTypes.string.isRequired,
    compositeId: PropTypes.string.isRequired,
    question: PropTypes.string.isRequired,
    code: PropTypes.string,
    done: PropTypes.bool,
    choiceOptions: PropTypes.arrayOf( PropTypes.shape({
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

        this.state = {...this.state, showHint: false, checkingAnswer: false, hintTimer: null};
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

        axios.post('/exercise/' + self.state.compositeId + '/solution', {selectedIds: this.state.selectedIds})
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
            self.setState( Object.assign({}, self.state, {checkingAnswer: false}));
        });

        this.setState( Object.assign({}, this.state, {checkingAnswer: true, showHint: false}));
    }


    onMultipleChoiceOptionSelect( data) {
        if( data.exerciseId != this.state.id) return;

        if( this.state.selectedIds.indexOf( data.choiceOptionId) == -1) {
            this.state = {...this.state, selectedIds: this.state.selectedIds.concat( data.choiceOptionId)};
            this.updateState();
        }
    }


    onMultipleChoiceOptionUnselect( data) {
        if( data.exerciseId != this.state.id) return;

        this.state = {...this.state, selectedIds: without( this.state.selectedIds, data.choiceOptionId)};
        this.updateState();
    }
}


function multipleChoiceAnswerCheck( exerciseId) {
    dispatch( 'MULTIPLE_CHOICE_ANSWER_CHECK', { exerciseId });
}


function multipleChoiceOptionSelect( exerciseId, choiceOptionId) {
    dispatch( 'MULTIPLE_CHOICE_OPTION_SELECT', { exerciseId, choiceOptionId });
}


function multipleChoiceOptionUnselect( exerciseId, choiceOptionId) {
    dispatch( 'MULTIPLE_CHOICE_OPTION_UNSELECT', { exerciseId, choiceOptionId });
}