import React from 'react';
import axios from 'axios';
import {cloneDeep, indexOf, find, every} from 'lodash';
import Parser from 'html-react-parser';
import {Segment, Label, Icon, Form, Checkbox, Button} from 'semantic-ui-react';
import PropTypes from 'prop-types';

export default class MultipleChoiceContent extends React.Component {
    constructor( props) {
        super(props);
        const state = {loading: false, done: props.done, answerHintTimer: null, selectedIds: props.selectedIds};
        this.state = state;

        this.handleSubmit = this.handleSubmit.bind(this);
        this.handleCheckboxChange = this.handleCheckboxChange.bind(this);
        this.hasError = this.hasError.bind(this);
        this.clearTimer = this.clearTimer.bind(this);
    }

    clearTimer() {
        const newState = Object.assign({}, this.state, {answerHintTimer: null});
        this.setState(newState);
    }

    hasError(options) {
        return !every(options, function(o) {
            return o.correct == o.selected;
        });
    }

    handleCheckboxChange(event, data) {
        const newState = Object.assign({}, this.state);
        if( data.checked) {
            newState.selectedIds.push( data.name);
            newState.selectedIds = newState.selectedIds.sort();
        } else {
            const index = newState.selectedIds.indexOf( data.name);
            if( index >= 0) {
                newState.selectedIds = newState.selectedIds.splice( index, 1);
            }
        }
        this.setState(newState);
    }

    handleSubmit(event) {
        event.preventDefault();

        if(!this.props.userId) {
            window.location.replace('/login');
            return;
        }

        if( this.state.answerHintTimer) {
            this.clearTimer();
        }

        const component = this;

        axios.post('/exercise/' + component.props.id + '/solution', {selectedIds: this.state.selectedIds})
        .then(function(response) {
            const solutionIsCorrect = response.data.solutionIsCorrect;
            const newState = Object.assign({}, component.state, {loading: false, done: solutionIsCorrect});
            if( !solutionIsCorrect) {
                newState.correctIds = response.data.correctIds.sort();
            }

            if( !newState.done) {
                newState.answerHintTimer = setTimeout( component.clearTimer, 3000);
                component.setState(newState);
            } else {
                component.setState(newState);
            }
        }).catch(function() {
            component.setState( Object.assign({}, component.state, {loading: false}));
        });

        this.setState( Object.assign({}, this.state, {loading: true}));
    }

    render() {
        const buttonProps = {loading: this.state.loading ? true : false, 
            icon: this.state.done ? 'checkmark' : 'wait',
            content: this.state.done ? 'Done' : 'Check'};

        const submitButton = this.props.userId ?
                <Button size='small' primary type="submit" labelPosition='left' {...buttonProps}/> :
                <Button size='small'  content='Login with Google to try'/>

        return (
            <Segment>
                <Label attached='top'><Icon name={this.state.done ? 'checkmark':'wait'} className="exercise status"/>Exercise</Label>

                {Parser(this.props.question)}

                <Form className="quiz" onSubmit={this.handleSubmit}>
                    <Form.Group className="grouped fields">
                        {this.props.choiceOptions.map( (choiceOption, i) => {
                            const checkedProps = this.state.selectedIds.indexOf( choiceOption.id) >= 0 ? {checked: true} : {};

                            return <Form.Field className={!this.state.answerHintTimer || this.state.selectedIds.indexOf(choiceOption.id) == this.state.correctIds.indexOf(choiceOption.id) ? '' : 'error'}
                                        key={choiceOption.id}>
                                        <Checkbox name={'' + choiceOption.id} label={Parser(choiceOption.html)} 
                                            {...checkedProps} onChange={this.handleCheckboxChange}/>
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

MultipleChoiceContent.PropTypes = {
    id: PropTypes.string.isRequired,
    question: PropTypes.string.isRequired,
    code: PropTypes.string,
    choiceOptions: PropTypes.arrayOf( PropTypes.shape({
        id: PropTypes.string.isRequired,
        html: PropTypes.string.isRequired,
    })),
    correctIds: PropTypes.arrayOf( PropTypes.string),
    userId: PropTypes.number,
    done: PropTypes.bool,
    selectedIds: PropTypes.arrayOf( PropTypes.number)
};