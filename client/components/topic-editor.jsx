import PropTypes from 'prop-types';
import React from 'react';
import MonacoEditor from 'react-monaco-editor';

export default class TopicEditor extends React.Component {
    constructor( props) {
        super( props);

        this.state = {rawContent: ''};
        this.editorDidMount = this.editorDidMount.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
    }

    handleSubmit() {
        this.setState({rawContent: this.editor.getValue()});
    }

    editorDidMount(editor, monaco) {
        editor.focus();
        this.setState({rawContent: editor.getValue()});
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
                    <label>Name</label>
                    <input name="name" placeholder="Name" type="text" defaultValue={this.props.name}/>
                </div>

                <div className="field">
                    <label>ToC Name</label>
                    <input name="tocName" placeholder="ToC Name" type="text" defaultValue={this.props.tocName}/>
                </div>

                <div className="field">
                    <label>slug</label>
                    <input name="slug" placeholder="slug" type="text" defaultValue={this.props.slug}/>
                </div>

                <div className="field">
                    <label>Content in Structured Markdown</label>
                    <div className="monaco-editor-shell">
                        <MonacoEditor
                            language="markdown"
                            theme="vs-light"
                            value={this.props.rawContent}
                            editorDidMount={this.editorDidMount}
                            requireConfig={requireConfig}
                            height="600"
                            options={editorOptions}
                        />
                    </div>
                    <textarea style={{display: 'none'}} name="rawContent" value={this.state.rawContent} />
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
};

TopicEditor.PropTypes = {
    slug: PropTypes.string,
    name: PropTypes.string,
    tocName: PropTypes.string,
    rawContent: PropTypes.string
};

TopicEditor.defaultProps = {
    slug: '',
    name: '',
    tocName: '',
    rawContent: ''
};