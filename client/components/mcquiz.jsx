import React from 'react';
import axios from 'axios';
import {cloneDeep, indexOf, find, every} from 'lodash';
import Parser from 'html-react-parser';
import {Segment, Label, Icon, Form, Checkbox, Button} from 'semantic-ui-react';

export default class McQuiz extends React.Component {
    constructor( props) {
        super(props);

        const state = {answerHintTimer: null, loading: false, content: cloneDeep(props.content)};
        if( state.content.done) {
            state.done = true;
            state.content.options.map((option, i) => {
                if( indexOf(state.content.solution.correctOptions, option.key) >= 0) {
                    option.selected = true;
                }
            });
        }
        this.state = state;

        this.handleSubmit = this.handleSubmit.bind(this);
        this.handleCheckboxChange = this.handleCheckboxChange.bind(this);
        this.hasError = this.hasError.bind(this);
        this.clearTimer = this.clearTimer.bind(this);
    }

    clearTimer() {
        const newState = Object.assign({}, this.state, {answerHintTimer: null});
        newState.content.options.map((o, i) => {
            o.error = false;
        });

        this.setState(newState);
    }

    hasError(options) {
        return !every(options, function(o) {
            return o.correct == o.selected;
        });
    }

    handleCheckboxChange(event, data) {
        const newState = Object.assign({}, this.state);
        const option = find(newState.content.options, {key: parseInt(data.name)});
        option.selected = data.checked;
        this.setState(newState);
    }

    handleSubmit(event) {
        event.preventDefault();

        if(!this.props.user) {
            window.location.replace('/login');
            return;
        }

        if( this.state.answerHintTimer) {
            this.clearTimer();
        }

        const component = this;

        axios.get('/exercise/' + component.state.content.id + '/solution')
        .then(function(response) {
            const correctOptions = response.data.data.correctOptions;
            const newState = Object.assign({}, component.state, {loading: false});
            newState.content.options.map((option, i) => {
                if( indexOf(correctOptions, option.key) >= 0) {
                    option.correct = true;
                }
            });

            newState.hasError = component.hasError(newState.content.options);
            if( newState.hasError) {
                newState.done = false;
                newState.answerHintTimer = setTimeout( component.clearTimer, 3000);
                component.setState(newState);
            } else {
                newState.done = true;
                component.setState(newState);
                component.props.markQuizAsDone(component, {correctOptions});
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

        const submitButton = this.props.user ?
                <Button size='small' primary type="submit" labelPosition='left' {...buttonProps}/> :
                <Button size='small'  content='Login with Google to try'/>

        return (
            <Segment>
                <Label attached='top'><Icon name={this.state.done ? 'checkmark':'wait'} className="exercise status"/>Exercise</Label>

                {Parser(this.state.content.html)}

                <Form className="quiz" onSubmit={this.handleSubmit}>
                    <Form.Group className="grouped fields">
                        {this.state.content.options.map( (option, i) => {
                            const checkedProps = option.selected ? {checked: true} : {};

                            return <Form.Field className={!this.state.answerHintTimer || option.correct == option.selected ? '' : 'error'}
                                        key={option.key}>
                                        <Checkbox name={'' + option.key} label={Parser(option.html)} 
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