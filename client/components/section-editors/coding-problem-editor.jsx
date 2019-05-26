import React from 'react'
import {ComponentNuxState, dispatch} from '../../nux.js'
import CodePlayground from '../code-playground/index.jsx'
import ResizableTextarea from '../resizable-textarea.jsx'
import {Segment, Label} from 'semantic-ui-react'
import CodeMirrorEditor from '../code-mirror.jsx';

export default class CodingProblemEditor extends React.Component {
    constructor(props) {
        super( props)
        this.nuxState = new CodingProblemEditorState( this);
        this.state = this.nuxState.state;
        this.markdownEditorId = `markdown-editor-${this.props.section.id}`
    }

    render() {
        const {section} = this.props

        return (
            <Segment id={section.id} className='exercise'>
                <Label attached='top'>Coding Problem (w/ Tests)</Label>

                <ResizableTextarea
                    id={this.markdownEditorId}
                    placeholder={'Question'}
                    minRows={2}
                    value={section.question}
                    onChange={(value) => {dispatch('SECTION_EDITOR_CONTENT_CHANGE', 
                        {sectionId: section.id, updates: {question: value}} )}} />
                <CodePlayground
                    id={section.id}
                    starterCode={section.code} />
                <CodeMirrorEditor
                    id={`tests-${section.id}`}
                    value={section.tests}
                    onChange={(id, value) => {
                        dispatch('SECTION_EDITOR_CONTENT_CHANGE', {sectionId: section.id, updates: {tests: value}})
                    }} />
            </Segment>
        )
    }
}

class CodingProblemEditorState extends ComponentNuxState {
    constructor(component) {
        super( component);
    }

    onEditorContentChange( data) {
        if( data.editorId != this.state.section.id) { return }

        dispatch('SECTION_EDITOR_CONTENT_CHANGE', 
                    {sectionId: this.state.section.id, updates: {code: data.content}})
    }
}
