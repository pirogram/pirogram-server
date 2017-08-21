import React from 'react';
import MonacoEditor from 'react-monaco-editor';

export default class TopicEditor extends React.Component {
    constructor( props) {
        super( props);
        this.state = {markdown: ""};
        this.editorDidMount = this.editorDidMount.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
    }

    handleSubmit() {
        this.setState({markdown: this.editor.getValue()});
    }

    editorDidMount(editor, monaco) {
        editor.focus();
        this.setState({markdown: editor.getValue()});
        this.editor = editor;
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
            <form className="ui topic form"
                onSubmit={this.handleSubmit}
                method="POST" encType='multipart/form-data'>
                <div className="field">
                    <label>Title</label>
                    <input name="title" placeholder="Title" type="text" defaultValue={this.props.title}/>
                </div>

                <div className="field">
                    <label>Content in Markdown</label>
                    <div className="ui divider hidden"></div>
                    <div className="monaco-editor-shell">
                        <MonacoEditor
                            language="markdown"
                            theme="vs-light"
                            value={this.props.markdown}
                            editorDidMount={this.editorDidMount}
                            requireConfig={requireConfig}
                            height="600"
                            options={editorOptions}
                        />
                    </div>
                    <textarea style={{display: 'none'}} name="markdown" value={this.state.markdown} />
                </div>

                <div className="fields">
                    <div className="field">
                        <button className="ui primary tiny submit button" type="submit" name="save">Save</button>
                    </div>
                    <div className="field">
                        <button className="ui tiny submit button" type="submit" name="discard">Discard</button>
                    </div>
                </div>
            </form>
        )
    }
}