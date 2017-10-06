import React from 'react';
import PropTypes from 'prop-types';
import MonacoEditor from 'react-monaco-editor';
import {Segment, Label, Icon, Form, Checkbox, Button} from 'semantic-ui-react';

export default class CodeContent extends React.Component {
    constructor( props) {
        super( props);

        this.state = {code: props.code};
        this.editorDidMount = this.editorDidMount.bind(this);
        this.runCode = this.runCode.bind(this);
    }

    runCode( code) {
    }

    editorDidMount(editor, m) {
        const self = this;

        this.editor = editor;
        this.editor.addCommand(monaco.KeyMod.Shift | monaco.KeyCode.Enter, function() {
            self.runCode( this.editor.getValue());
        }, '');
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

        return(
            <Segment>
                <Label attached='top'>
                    <Icon name='code'/>Code Playground (Shift+Enter to Execute)
                </Label>
                <div className='runnable-code'>
                    <div className="monaco-editor-shell">
                        <MonacoEditor
                            language={this.props.lang}
                            theme="vs-light"
                            value={this.state.code}
                            editorDidMount={this.editorDidMount}
                            requireConfig={requireConfig}
                            height="200"
                            options={editorOptions}
                        />
                    </div>
                </div>
            </Segment>
        );
    }
}

CodeContent.PropTypes = {
    lang: PropTypes.string.isRequired,
    code: PropTypes.string.isRequired
};