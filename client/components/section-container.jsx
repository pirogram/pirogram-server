import React from 'react';
import Section from './section.jsx';
import SectionEditor from './section-editor.jsx';
import {Button} from 'semantic-ui-react';
import {ComponentNuxState, dispatch} from '../nux';

export default class SectionContainer extends React.Component {
    constructor( props) {
        super( props)

        this.nuxState = new SectionContainerState( this)
        this.state = this.nuxState.state

        if( this.props.section.type == 'tbd') {
            this.state.editMode = true
        }
    }

    render() {
        const {section, userId} = this.props

        return <div className={this.state.editMode ? 'section-container edit-mode' : 'section-container'}
                onMouseEnter={(e) => dispatch('SECTION_CONTAINER_HOVERING', {sectionId: section.id})}
                onMouseLeave={(e) => dispatch('SECTION_CONTAINER_NOT_HOVERING', {sectionId: section.id})}>

            <div className='section-toolbar'
                    style={{display: this.state.hovering || this.state.editMode ? null : 'none'}}>
                <Button.Group >
                    <Button icon='plus' size='mini' 
                        onClick={(e) => dispatch('SECTION_ADD_NEW', {beforeAfter: 'before', sectionId: section.id})}/>
                    {this.state.editMode ?
                        <Button icon='green checkmark' size='mini'
                            onClick={(e) => dispatch('SECTION_CONTAINER_DONE_EDIT', {sectionId: section.id})}/> :
                        <Button icon='edit' size='mini' 
                            onClick={(e) => dispatch('SECTION_CONTAINER_DO_EDIT', {sectionId: section.id})}/>
                    }
                    <Button icon='chevron up' size='mini'
                        onClick={(e) => dispatch('SECTION_MOVE_UP', {sectionId: section.id})}/>
                </Button.Group>
                <br/>
                <Button.Group >
                    <Button icon='plus' size='mini' 
                        onClick={(e) => dispatch('SECTION_ADD_NEW', {beforeAfter: 'after', sectionId: section.id})}/>
                    <Button icon='trash' size='mini'
                        onClick={(e) => dispatch('SECTION_REMOVE', {sectionId: section.id})}/>
                    <Button icon='chevron down' size='mini'
                        onClick={(e) => dispatch('SECTION_MOVE_DOWN', {sectionId: section.id})}/>
                </Button.Group>
            </div>
            {this.state.editMode ? 
                <SectionEditor section={section} /> : 
                <Section section={section} userId={userId} viewOnly={false}/>}
            {this.state.editMode ?  <div className="ui hidden clearing divider"/> : null}
        </div>
    }
}

class SectionContainerState extends ComponentNuxState {
    constructor(component) {
        super( component);
        this.state = Object.assign({}, this.state, { hovering: false, editMode: false, updates: {}});
    }

    onSectionContainerHovering( data) {
        if( data.sectionId != this.state.section.id) { return }

        const newState = Object.assign( {}, this.state, { hovering: true})
        this.setState( newState)
    }

    onSectionContainerNotHovering( data) {
        if( data.sectionId != this.state.section.id) { return }

        const newState = Object.assign( {}, this.state, { hovering: false})
        this.setState( newState)
    }

    onSectionContainerDoEdit( data) {
        if( data.sectionId != this.state.section.id
            || this.state.section.type == 'tbd') { return }

        const newState = Object.assign( {}, this.state, { editMode: true})
        this.setState( newState)
    }

    onSectionEditorContentChange( data) {
        if( data.sectionId != this.state.section.id) { return }

        Object.assign(this.state.updates, data.updates)
    }

    onSectionContainerDoneEdit( data) {
        if( data.sectionId != this.state.section.id) { return }

        Object.assign( this.state.section, this.state.updates)
        this.state.section.clean()

        const newState = Object.assign( {}, this.state, {editMode: false, updates: {}})
        this.setState( newState)
    }
}