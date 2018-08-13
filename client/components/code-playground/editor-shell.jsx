import React from 'react';
import PropTypes from 'prop-types';
import MonacoEditor from 'react-monaco-editor';
import uuid from 'uuid/v4';
import {Icon} from 'semantic-ui-react';
import {dispatch} from '../../nux.js';

export default class Editor extends React.Component {
    constructor( props) {
        super( props);
        this.state = {code: props.code, shellId: 'id-' + uuid(), height: this.calcHeight(props.code)};

        this.editorDidMount = this.editorDidMount.bind(this);
        this.onChange = this.onChange.bind(this);
        this.adjustEditorHeight = this.adjustEditorHeight.bind(this);
        this.calcHeight = this.calcHeight.bind(this);
    }

    setCode( code) {
        this.editor.setValue(code);

        this.onChange(code);
    }

    getCode( code) {
        return this.editor.getValue();
    }

    calcHeight( code) {
        let linesCount = 0;
        for( const line of code.split('\n')) {
            linesCount += Math.floor(line.length/75) + 1;
        }

        if( linesCount == 0) { linesCount = 1; }

        const height = (linesCount) * 24;

        return height + 'px';
    }

    onChange( newValue) {
        dispatch( 'EDITOR_CONTENT_CHANGE', {editorId: this.props.id, content: newValue});

        const newState = {code: newValue, height: this.calcHeight(newValue)};

        this.setState(Object.assign({}, this.state, newState));
        this.adjustEditorHeight( newState.height);
    }

    adjustEditorHeight(height) {
        const shellEl = document.querySelector(`#${this.state.shellId}`);
        if( !shellEl) return;

        shellEl.style.height = height || this.state.height;
        this.editor.layout();
    }

    
    editorDidMount(editor, m) {
        const self = this;

        this.editor = editor;
        this.editor.addCommand(monaco.KeyMod.Shift | monaco.KeyCode.Enter, function() {
            self.props.executeCmd( self.editor.getValue());
        }, '');

        this.adjustEditorHeight();

        dispatch( 'EDITOR_CONTENT_CHANGE', {editorId: this.props.id, content: editor.getValue()});
    }

    shouldComponentUpdate( nextProps, nextState) {
        return false;
    }

    render() {
        const requireConfig = {
            url: 'https://cdnjs.cloudflare.com/ajax/libs/require.js/2.3.1/require.min.js',
            paths: {
                'vs': '/static/js/vs'
            }
        };

        const editorOptions = {
            wrappingColumn: 75,
            lineNumbers: true,
            scrollBeyondLastLine: false,
            wordWrap: "on",
            wrappingIndent: "same",
            horizontalHasArrows: true,
            horizontal: 'visible',
            minimap: { enabled: false },
            fontSize: 16,
            fontFamily: "Inconsolata",
            renderLineHighlight: 'none',
            autoClosingBrackets: true,
            autoIndent: true,
            formatOnPaste: true,
            formatOnType: true,
            renderIndentGuides: true,
            suggestSelection: 'recentlyUsed',
            lineNumbersMinChars: 2,
            language: 'python'
        };

        return(
            <div id={this.state.shellId} className='code-editor-shell' style={{height: this.state.height}}>
                <MonacoEditor
                    language='python'
                    theme="vs-light"
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

Editor.PropTypes = {
    id: PropTypes.string.isRequired,
    code: PropTypes.string.isRequired,
    executeCmd: PropTypes.func.isRequired,
}
