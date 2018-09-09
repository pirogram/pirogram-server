import React from 'react';
import PropTypes from 'prop-types';
import {Icon} from 'semantic-ui-react';
import Editor from './editor-shell.jsx';

export default class CodeEditor extends React.Component {
    constructor( props) {
        super( props);

        this.runCode = this.runCode.bind(this);
        this.revertCode = this.revertCode.bind(this);
    }

    runCode( e) {
        e.preventDefault();
        this.props.executeCmd( this.editor.getCode());
    }

    revertCode( e) {
        e.preventDefault();
        this.editor.setCode( this.props.starterCode);
    }

    render() {
        let playIcon = <Icon name='play' title='Run Code'/>;
        if( this.props.loading) {
            playIcon = <Icon name='circle notched' loading/>;
        }

        return(
            <div className='code-editor'>
                <div className='block-name'>
                    <a href='#' onClick={this.runCode}>{playIcon}</a> 
                    {this.props.starterCode ? <a href='#' onClick={this.revertCode}><Icon name='reply' title='Revert to Starter Code'/></a> : null}
                </div>
                <Editor id={this.props.id} code={this.props.code} ref={(editor) => {this.editor = editor;}} executeCmd={this.props.executeCmd}/>
            </div>
        );
    }
}

CodeEditor.PropTypes = {
    id: PropTypes.string.isRequired,
    code: PropTypes.string.isRequired,
    executeCmd: PropTypes.func.isRequired,
    userCode: PropTypes.string,
    starterCode: PropTypes.string
}