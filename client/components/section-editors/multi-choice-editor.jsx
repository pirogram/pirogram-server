import React from 'react'
import {ComponentNuxState, dispatch} from '../../nux.js'
import CodePlayground from '../code-playground/index.jsx'
import ResizableTextarea from '../resizable-textarea.jsx'
import {Segment, Label, Input, Checkbox, Form, Button} from 'semantic-ui-react'
import cloneDeep from 'lodash/cloneDeep'


export default class MultiChoiceEditor extends React.Component {
    constructor(props) {
        super( props)
        this.nuxState = new MultiChoiceEditorState( this);
        this.state = this.nuxState.state;
        this.markdownEditorId = `markdown-editor-${this.props.section.id}`
    }

    render() {
        const {section} = this.props

        return (
            <Segment id={section.id} className='exercise'>
                <Label attached='top'>Multi Choice</Label>

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
                    {this.state.options.map( (option, i) => {
                        return (
                            <Form.Group key={option.id}>
                                <Form.Field>
                                    <Checkbox name={option.id} defaultChecked={option.correct}
                                        onChange={(e, data) => {option.correct = data.checked}}/>
                                </Form.Field>
                                <Form.Field width={12}>
                                    <Input fluid value={option.text}
                                        onChange={(e, data) => {
                                            dispatch('MULTI_CHOICE_TEXT_CHANGE', {sectionId: section.id, optionId: option.id, text: data.value})
                                        }}/>
                                </Form.Field>
                                <Form.Field>
                                    <Button icon='trash'
                                        onClick={(e) => {dispatch('MULTI_CHOICE_DELETE_OPTION', 
                                            {sectionId: section.id, optionId: option.id})}}/>
                                </Form.Field>
                            </Form.Group>
                        )
                    })}
                    <Form.Field>
                        <Button basic icon='plus' onClick={(e) => {dispatch('MULTI_CHOICE_ADD_OPTION', {sectionId: section.id})}}>add more</Button>
                    </Form.Field>
                </Form>
            </Segment>
        )
    }
}

class MultiChoiceEditorState extends ComponentNuxState {
    constructor(component) {
        super( component)
        if( !this.state.section.options.length) {
            this.state.options = [
                {id: "0", correct: false, text: '', html: '<p></p>'},
                {id: "1", correct: false, text: '', html: '<p></p>'},
                {id: "2", correct: false, text: '', html: '<p></p>'},
                {id: "3", correct: false, text: '', html: '<p></p>'}
            ]
        } else {
            this.state.options = cloneDeep( this.state.section.options)
        }

        dispatch('SECTION_EDITOR_CONTENT_CHANGE', {sectionId: this.state.section.id, updates: {options: this.state.options}})

        component.state = this.state
    }

    onEditorContentChange( data) {
        if( data.editorId != this.state.section.id) { return }

        dispatch('SECTION_EDITOR_CONTENT_CHANGE', 
                    {sectionId: this.state.section.id, updates: {code: data.content}})
    }

    onMultiChoiceDeleteOption( data) {
        if( data.sectionId != this.state.section.id) return

        const options = []
        this.state.options.map((option, index) => {
            if( option.id != data.optionId) { 
                options.push( option)
            }
        })

        options.map((option, index) => {
            option.id = index.toString()
        })

        dispatch('SECTION_EDITOR_CONTENT_CHANGE', 
            {sectionId: this.state.section.id, updates: {options}})
        this.setState( Object.assign({}, this.state, {options}))
    }

    onMultiChoiceTextChange( data) {
        if( data.sectionId != this.state.section.id) return

        const options = []
        this.state.options.map( (option, index) => {
            if( option.id == data.optionId) {
                option = cloneDeep( option)
                option.text = data.text
            }
            options.push( option)
        })

        dispatch('SECTION_EDITOR_CONTENT_CHANGE', 
            {sectionId: this.state.section.id, updates: {options}})
        this.setState( Object.assign({}, this.state, {options}))
    }

    onMultiChoiceAddOption( data) {
        if( data.sectionId != this.state.section.id) return

        const options = this.state.options.map( (option) => {return option})
        options.push( {
            id: options.length.toString(),
            correct: false,
            text: '',
            html: '<p></p>'
        })

        dispatch('SECTION_EDITOR_CONTENT_CHANGE', 
            {sectionId: this.state.section.id, updates: {options}})
        this.setState( Object.assign({}, this.state, {options}))
    }
}