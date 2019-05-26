import React from 'react';
import {dispatch} from '../../nux.js';
import ResizableTextarea from '../resizable-textarea.jsx'

export default class MarkdownEditor extends React.Component {
    constructor(props) {
        super( props)
        this.editorId = `markdown-editor-${props.section.id}`
    }

    componentDidMount() {
        document.getElementById( this.editorId).focus()
    }

    render() {
        const s = this.props.section

        return (
            <ResizableTextarea
                id={this.editorId}
                placeholder={'Type in markdown...'}
                minRows={2}
                value={s.text}
                onChange={(value) => {dispatch('SECTION_EDITOR_CONTENT_CHANGE', 
                    {sectionId: s.id, updates: {text: value}} )}} />
        )
    }
}
