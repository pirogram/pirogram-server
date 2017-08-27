import React from 'react';
import Parser from 'html-react-parser';
import {cloneDeep} from 'lodash';
import axios from 'axios';
import {Segment, Label, Form, Icon, Button, Divider, Modal} from 'semantic-ui-react';
import MonacoEditor from 'react-monaco-editor';

export default class OfflineExercise extends React.Component {
    constructor(props) {
        super(props);

        this.state = {done: false, loadingSolution: false, showSolution: false, solution: "", 
            code: '', content: cloneDeep(props.content)};

        if( this.state.content.done) {
            this.state.done = true;
            this.state.code = this.state.content.solution.code;
        }

        this.markQuizAsDone = this.markQuizAsDone.bind(this);
        this.editorDidMount = this.editorDidMount.bind(this);
        this.onChange = this.onChange.bind(this);

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

    onChange(editorContent) {
        this.editorContent = editorContent;
    }

    editorDidMount(editor, monaco) {
        //this.setState({code: editor.getValue()});
        this.editor = editor;
    }

    markQuizAsDone(event) {
        event.preventDefault();

        if(!this.props.user) {
            window.location.replace('/login');
            return;
        }

        const newState = Object.assign({}, this.state, {done: true, code: this.editorContent});
        this.setState(newState);
        this.props.markQuizAsDone(this, {code: newState.code});
    }

    render() {
        const requireConfig = {
            url: 'https://cdnjs.cloudflare.com/ajax/libs/require.js/2.3.1/require.min.js',
            paths: {
                'vs': '/static/js/vs'
            }
        };

        const editorOptions = {
            wrappingColumn: 80,
            lineNumbers: false,
            scrollBeyondLastLine: false,
            wordWrap: "wordWrapColumn",
            wrappingIndent: "same",
            horizontalHasArrows: true,
            horizontal: 'visible',
            minimap: { enabled: false },
            fontSize: 13,
            fontFamily: "Monaco"
        };

        const buttonProps = { icon: this.state.done ? 'checkmark' : 'wait',
            content: this.state.done ? 'Done' : 'Mark As Done'};

        const submitButton = this.props.user ?
            <Button size='small' primary type="submit" labelPosition='left' {...buttonProps}/> :
            <Button size='small'  content='Login with Google to save progress'/>

        return (
            <Segment>
                <Modal dimmer='blurring' open={this.state.showSolution}>
                    <Modal.Header>Solution</Modal.Header>
                    <Modal.Content>
                        <Modal.Description>
                            {Parser(this.state.solution)}
                        </Modal.Description>
                    </Modal.Content>
                    <Modal.Actions>
                        <Button primary onClick={this.closeSolutionWindow}>
                            Ok
                        </Button>
                    </Modal.Actions>
                </Modal>

                <Label attached='top'>
                    <Icon name={this.state.done ? 'checkmark':'wait'} className="exercise status"/>Exercise (offline)
                    | <a href="#" onClick={this.showSolutionWindow}><Icon name={this.state.loadingSolution ? 'spinner' : 'idea'}/>Solution</a>
                </Label>
                {Parser(this.state.content.html)}

                <Form onSubmit={this.markQuizAsDone}>
                    <Divider/>
                    <p><strong>Copy paste your code here for reference.</strong></p>

                    <div className="monaco-editor-shell">
                        <MonacoEditor
                            language="python"
                            theme="vs-light"
                            value={this.state.code}
                            editorDidMount={this.editorDidMount}
                            requireConfig={requireConfig}
                            height="200"
                            options={editorOptions}
                            onChange={this.onChange}
                        />
                    </div>
                    <br/>

                    {submitButton}
                </Form>
            </Segment>
        )
    }
}
