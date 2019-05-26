import React from 'react'
import {ComponentNuxState, dispatch} from '../../nux.js'
import CodePlayground from '../code-playground/index.jsx'
import ResizableTextarea from '../resizable-textarea.jsx'
import {Segment, Label, Input, Checkbox, Form, Button} from 'semantic-ui-react'
import cloneDeep from 'lodash/cloneDeep'


export default class CategorizeEditor extends React.Component {
    constructor(props) {
        super( props)
        this.nuxState = new CategorizeEditorState( this);
        this.state = this.nuxState.state;
        this.markdownEditorId = `markdown-editor-${this.props.section.id}`
    }

    render() {
        const {section} = this.props

        return (
            <Segment id={section.id} className='exercise'>
                <Label attached='top'>Select Answer</Label>

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
                
                <Form>
                    {this.state.mappings.map( (mapping, index) => {
                        return (
                            <Form.Group key={index}>
                                <Form.Field width={8}>
                                    <Input fluid value={mapping.challenge} placeholder='Challenge'
                                        onChange={(e, data) => {
                                            dispatch('CATEGORIZE_CHALLENGE_CHANGE', {sectionId: section.id, mappingIndex: index, challenge: data.value})
                                        }}/>
                                </Form.Field>
                                <Form.Field width={8}>
                                    <Input fluid value={mapping.answer} placeholder='Answer'
                                        onChange={(e, data) => {
                                            dispatch('CATEGORIZE_ANSWER_CHANGE', {sectionId: section.id, mappingIndex: index, answer: data.value})
                                        }}/>
                                </Form.Field>
                                <Form.Field>
                                    <Button icon='trash'
                                        onClick={(e) => {dispatch('CATEGORIZE_DELETE_MAPPING', 
                                            {sectionId: section.id, mappingIndex: index})}}/>
                                </Form.Field>
                            </Form.Group>
                        )
                    })}
                    <Form.Field>
                        <Button basic icon='plus' onClick={(e) => {dispatch('CATEGORIZE_ADD_MAPPING', {sectionId: section.id})}}>add more</Button>
                    </Form.Field>
                </Form>
            </Segment>
        )
    }
}

class CategorizeEditorState extends ComponentNuxState {
    constructor(component) {
        super( component)
        if( !this.state.section.mappings.length) {
            this.state.mappings = [
                {challenge: '', answer: ''},
                {challenge: '', answer: ''},
                {challenge: '', answer: ''},
                {challenge: '', answer: ''}
            ]
        } else {
            this.state.mappings = cloneDeep( this.state.section.mappings)
        }

        dispatch('SECTION_EDITOR_CONTENT_CHANGE', 
            {sectionId: this.state.section.id, updates: {mappings: this.state.mappings}})

        component.state = this.state
    }

    onEditorContentChange( data) {
        if( data.editorId != this.state.section.id) { return }

        dispatch('SECTION_EDITOR_CONTENT_CHANGE', 
                    {sectionId: this.state.section.id, updates: {code: data.content}})
    }

    onCategorizeDeleteMapping( data) {
        if( data.sectionId != this.state.section.id) return

        const mappings = this.state.mappings.splice( data.mappingIndex, 1)

        dispatch('SECTION_EDITOR_CONTENT_CHANGE', 
            {sectionId: this.state.section.id, updates: {mappings}})
        this.setState( Object.assign({}, this.state, {mappings}))
    }

    onCategorizeChallengeChange( data) {
        if( data.sectionId != this.state.section.id) return

        const mappings = []
        this.state.mappings.map( (mapping, index) => {
            if( index == data.mappingIndex) {
                mapping = cloneDeep( mapping)
                mapping.challenge = data.challenge
            }
            mappings.push( mapping)
        })

        dispatch('SECTION_EDITOR_CONTENT_CHANGE', 
            {sectionId: this.state.section.id, updates: {mappings}})
        this.setState( Object.assign({}, this.state, {mappings}))
    }

    onCategorizeAnswerChange( data) {
        if( data.sectionId != this.state.section.id) return

        const mappings = []
        this.state.mappings.map( (mapping, index) => {
            if( index == data.mappingIndex) {
                mapping = cloneDeep( mapping)
                mapping.answer = data.answer
            }
            mappings.push( mapping)
        })

        dispatch('SECTION_EDITOR_CONTENT_CHANGE', 
            {sectionId: this.state.section.id, updates: {mappings}})
        this.setState( Object.assign({}, this.state, {mappings}))
    }

    onCategorizeAddMapping( data) {
        if( data.sectionId != this.state.section.id) return

        const mappings = this.state.mappings.map( (mapping) => {return mapping})
        mappings.push( {
            challenge: '',
            answer: ''
        })

        dispatch('SECTION_EDITOR_CONTENT_CHANGE', 
            {sectionId: this.state.section.id, updates: {mappings}})
        this.setState( Object.assign({}, this.state, {mappings}))
    }
}