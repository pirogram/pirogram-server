import React from 'react';
import Parser from 'html-react-parser';
import _ from 'lodash';
import {Segment, Label, Form, Icon, Button, Divider} from 'semantic-ui-react';
import {commonmarkToHtml} from '../../lib/turtle-markdown.js';
import MonacoEditor from 'react-monaco-editor';

export default class OfflineExercise extends React.Component {
    constructor(props) {
        super(props);

        this.state = {done: false, code: '', content: _.cloneDeep(props.content)};
        if( this.state.content.done) {
            this.state.done = true;
            this.state.code = this.state.content.solution.code;
        }

        this.markQuizAsDone = this.markQuizAsDone.bind(this);
        this.editorDidMount = this.editorDidMount.bind(this);
        this.onChange = this.onChange.bind(this);
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
                <Label attached='top'>
                    <Icon name={this.state.done ? 'checkmark':'wait'} className="exercise status"/>Exercise (offline)
                </Label>
                {Parser(commonmarkToHtml(this.state.content.text))}

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
