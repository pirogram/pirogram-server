import React from 'react';
import SectionContainer from './section-container.jsx';
import {ComponentNuxState} from '../nux'
import {Section} from '../../codebook/section.js';
import uuidv4 from 'uuid/v4';
import findIndex from 'lodash/findIndex'
import find from 'lodash/find'

export default class TopicEditor extends React.Component {
    constructor( props) {
        super( props)
        this.nuxState = new TopicEditorState( this)
        this.state = this.nuxState.state
    }

    render() {
        const {topic, userId} = this.state

        return (
            <div className='topic-sections'>
                {topic.sections.map( (section, i) => {
                    return <SectionContainer key={section.id} section={section} userId={userId}/>;
                })}
            </div>
        )
    }
}

class TopicEditorState extends ComponentNuxState {
    constructor( component) {
        super( component)
        this.state = Object.assign({}, this.state);
    }

    onSectionAddNew( data) {
        const topic = this.state.topic
        let index = findIndex( topic.sections, {id: data.sectionId})
        if( index == -1) return

        if( data.beforeAfter == 'after') {
            index += 1
        }

        topic.sections.splice( index, 0, new Section({type: 'tbd', id: uuidv4()}))
        this.component.forceUpdate()
    }

    onSectionTypeSelected( data) {
        const section = find( this.state.topic.sections, {id: data.sectionId})
        if( section) {
            section.type = data.type
            section.initBlank()
            this.state.topic.resetIndex()
            this.component.forceUpdate()
        }
    }

    onSectionRemove( data) {
        const topic = this.state.topic
        const index = findIndex( topic.sections, {id: data.sectionId})
        if( index == -1) return

        topic.sections.splice( index, 1)
        this.state.topic.resetIndex()
        this.component.forceUpdate()
    }

    onSectionMoveUp( data) {
        const sections = this.state.topic.sections
        const index = findIndex( sections, {id: data.sectionId})
        if( index <= 0) return

        const section = sections[ index]
        sections.splice( index, 1)
        sections.splice( index - 1, 0, section)
        this.state.topic.resetIndex()
        this.component.forceUpdate()
    }

    onSectionMoveDown( data) {
        const sections = this.state.topic.sections
        const index = findIndex( sections, {id: data.sectionId})
        if( index == -1 || index == (sections.length-1)) return

        const section = sections[ index]
        sections.splice( index, 1)
        sections.splice( index + 1, 0, section)
        this.state.topic.resetIndex()
        this.component.forceUpdate()
    }
}