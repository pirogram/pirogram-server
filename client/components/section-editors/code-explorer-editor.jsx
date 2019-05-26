import React from 'react'
import {ComponentNuxState, dispatch} from '../../nux.js'
import CodePlayground from '../code-playground/index.jsx'

export default class CodeExplorerEditor extends React.Component {
    constructor(props) {
        super( props)
        this.nuxState = new CodeExplorerEditorState( this);
        this.state = this.nuxState.state;
    }

    render() {
        return (
            <CodePlayground
                id={this.props.section.id}
                starterCode={this.props.section.code} />
        )
    }
}

class CodeExplorerEditorState extends ComponentNuxState {
    constructor(component) {
        super( component);
    }

    onEditorContentChange( data) {
        if( data.editorId != this.state.section.id) { return }

        dispatch('SECTION_EDITOR_CONTENT_CHANGE', 
                    {sectionId: this.state.section.id, updates: {code: data.content}})
    }
}
