import React from 'react';
import PropTypes from 'prop-types';
import MonacoEditor from 'react-monaco-editor';
import {dispatch} from '../nux';
import uuid from 'uuid/v4';

export default class CodeEditor extends React.Component {
    constructor( props) {
        super( props);
        this.state = {code: props.code, id: 'id-' + uuid()};

        this.editorDidMount = this.editorDidMount.bind(this);
        this.onChange = this.onChange.bind(this);
        this.adjustEditorHeight = this.adjustEditorHeight.bind(this);
    }

    onChange( newValue, e) {
        const newState = Object.assign({}, this.state, {code: newValue});
        this.setState( newState);

        this.adjustEditorHeight();
    }

    adjustEditorHeight() {
        const shellEl = document.querySelector(`#${this.state.id}`);
        if( !shellEl) return;

        const linesCount = document.querySelectorAll(`#${this.state.id} .view-lines .view-line`).length;
        const height = (linesCount + 1) * 20;

        shellEl.style.height = (height < 200 ? 200 : height) + 'px';
        this.editor.layout();
    }

    editorDidMount(editor, m) {
        const self = this;

        this.editor = editor;
        this.editor.addCommand(monaco.KeyMod.Shift | monaco.KeyCode.Enter, function() {
            dispatch( 'CODE_EXECUTION_REQUEST', {playgroundId: self.props.id, code: self.editor.getValue()});
        }, '');

        this.adjustEditorHeight();
    }

    shouldComponentUpdate( nextProps, nextState) {
        return false;

        // if( nextProps.code == this.props.code && nextState.code == this.state.code) {
        //     return false;
        // } else {
        //     return true;
        // }
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
            fontFamily: "Monaco",
            renderLineHighlight: 'none'
        };

        return(
            <div id={this.state.id} class='code-editor-shell' style={{height: '200px'}}>
                <MonacoEditor
                    language='python'
                    theme="vs-dark"
                    value={this.state.code}
                    editorDidMount={this.editorDidMount}
                    onChange={this.onChange}
                    requireConfig={requireConfig}
                    options={editorOptions}
                    />
            </div>
        );
    }
}