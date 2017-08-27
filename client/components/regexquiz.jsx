import React from 'react';
import Parser from 'html-react-parser';
import axios from 'axios';
import {cloneDeep, map, find} from 'lodash';
import {Segment, Label, Icon, Form, Button, Divider, Grid, Input, Modal, Header} from 'semantic-ui-react';

export default class RegexQuiz extends React.Component {
    constructor( props) {
        super(props);

        const state = {done: false, loadingSolution: false, showSolutionWindow: false, 
            regex: '', tried: false, loading: false, content: cloneDeep(props.content)};
        
        if( state.content.done) {
            state.done = true;
            state.regex = props.content.solution.regex;
            state.content.options.map((option,i) => {
                option.correct = true;
            })
        }
        this.state = state;

        this.handleSubmit = this.handleSubmit.bind(this);
        this.handleRegexChange = this.handleRegexChange.bind(this);
        this.showSolutionWindow = this.showSolutionWindow.bind(this);
        this.closeSolutionWindow = this.closeSolutionWindow.bind(this);
    }

    showSolutionWindow(e) {
        e.preventDefault();
        this.setState(Object.assign({}, this.state, {loadingSolution: true}));

        const component = this;
        axios.get('/exercise/' + component.state.content.id + '/solution')
        .then(function(response){
            component.setState(Object.assign({}, component.state, 
                {loadingSolution: false, showSolution: true, solution: response.data.data.solution}));
        })
        .catch(function(e) {
            console.log(e);
            component.setState(Object.assign({}, this.state, {loadingSolution: false}));
        });
    }

    closeSolutionWindow(e) {
        e.preventDefault();
        this.setState(Object.assign({}, this.state, {showSolution: false}));
    }

    handleRegexChange(event, data) {
        this.setState(Object.assign({}, this.state, {regex: data.value}));
    }

    handleSubmit(event) {
        event.preventDefault();

        if(!this.props.user) {
            window.location.replace('/login');
            return;
        }


        const component = this;

        axios.post('/regex-match', {regex: this.state.regex, texts: map(this.state.content.options, 'text')})
        .then(function(response) {
            const newState = Object.assign({}, component.state, {tried: true, loading: false});

            newState.content.options.map((option, i) => {
                if( option.shouldMatch) {
                    option.correct = response.data.texts[option.text] ? true : false;
                } else {
                    option.correct = response.data.texts[option.text] ? false : true;
                }
            });

            if( !find(newState.content.options, {correct: false})) {
                newState.done = true;
                component.setState(newState);
                component.props.markQuizAsDone(component, {regex: component.state.regex});
            } else {
                newState.done = false;
                component.setState(newState);
            }
        }).catch(function(e) {
            console.log(e);
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
                <Modal dimmer='blurring' open={this.state.showSolution}>
                    <Modal.Header>Solution</Modal.Header>
                    <Modal.Content>
                        <Modal.Description>
                            {this.state.solution}
                        </Modal.Description>
                    </Modal.Content>
                    <Modal.Actions>
                        <Button primary onClick={this.closeSolutionWindow}>
                            Ok
                        </Button>
                    </Modal.Actions>
                </Modal>
            
                <Label attached='top'>
                    <Icon name={this.state.done ? 'checkmark':'wait'} className="exercise status"/>Exercise
                    | <a href="#" onClick={this.showSolutionWindow}><Icon name={this.state.loadingSolution ? 'spinner' : 'idea'}/>Solution</a>
                </Label>

                <Form className="regex" onSubmit={this.handleSubmit}>
                    {Parser(this.state.content.html)}
                        
                    <Form.Field width={8}>
                        <Input name="solution" placeholder="regex" value={this.state.regex} onChange={this.handleRegexChange}/>
                    </Form.Field>
                        
                    <Form.Field>
                        {submitButton}
                    </Form.Field>

                    <Divider/>

                    <Grid stackable columns={2}>
                        <Grid.Column>
                            <h5>Should Match</h5>
                            <div>
                                {this.state.content.options.map( (option, i) => {
                                    if( option.shouldMatch) {
                                        const optionProps = {};
                                        if( (this.state.tried || this.state.done) && option.correct) {
                                            optionProps.color = 'green';
                                        } else if( this.state.tried && !option.correct) {
                                            optionProps.color = 'red';
                                        }
                                        return <Label key={i} basic {...optionProps}>{option.text}</Label>;
                                    }
                                })}
                            </div>
                        </Grid.Column>

                        <Grid.Column>
                            <h5>Should Not Match</h5>
                            <div>
                                {this.state.content.options.map( (option, i) => {
                                    if( !option.shouldMatch) { 
                                        const optionProps = {};
                                        if( (this.state.tried || this.state.done) && !option.correct) {
                                            optionProps.color = 'red';
                                        }
                                        return <Label key={i} basic {...optionProps}>{option.text}</Label>; 
                                    }
                                })}
                            </div>
                        </Grid.Column>
                    </Grid>
                </Form>
            </Segment>
        )
    }
}
