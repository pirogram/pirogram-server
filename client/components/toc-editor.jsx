import React from 'react';
import {Menu, Input} from 'semantic-ui-react';
import ContextMenuContainer from './context-menu.jsx'
import {ComponentNuxState, dispatch} from '../nux';
import findIndex from 'lodash/findIndex'
import find from 'lodash/find'
import cloneDeep from 'lodash/cloneDeep'
import uuidv4 from 'uuid/v4'
import {DragDropContext, Droppable, Draggable} from 'react-beautiful-dnd'

const groupContextItems = [
    {content: "Add Group Before", id: 'add-group-before'},
    {content: "Add Group After", id: 'add-group-after'},
    {content: "Add Topic", id: 'add-topic-in-group'},
    {content: "Edit", id: 'edit-group'},
    {content: "Delete", id: 'delete-group'},
]

const topicContextItems = [
    {content: "Add Topic Before", id: 'add-topic-before'},
    {content: "Add Topic After", id: 'add-topic-after'},
    {content: "Edit", id: 'edit-topic'},
    {content: "Delete", id: 'delete-topic'},
]

const beingEdited = {}

class Title extends React.Component {
    constructor( props) {
        super( props)
        this.state = {title: props.title}
        this.onChange = this.onChange.bind( this)
        this.onKeyDown = this.onKeyDown.bind( this)
    }

    onChange( e) {
        this.setState( { title: e.target.value})
    }

    onKeyDown( e) {
        const charCode = e.keyCode || e.charCode
        if( charCode == 13) {
            dispatch( 'TOC_TITLE_EDITING_DONE', {id: this.props.id, index: this.props.index, title: this.state.title})
        } else if( charCode == 27) {
            dispatch( 'TOC_TITLE_EDITING_DONE', {id: this.props.id, index: this.props.index, title: this.props.title})
        }
    }

    render() {
        return (
            <div style={{whiteSpace: 'nowrap'}}>
                {this.props.index + '. '} 
                {this.props.editing ?
                    <Input focus={true} value={this.state.title} onClick={(e) => {e.preventDefault()}}
                        onKeyDown={this.onKeyDown} onChange={this.onChange}/> :
                    this.props.title}
            </div>
        )
    }
}

class TOCTopicEditor extends React.Component {
    render() {
        const {topic, currEntry, bookCode, index} = this.props

        return (
            <Draggable draggableId={topic.id} index={index}>
                {provided => (
                    <div {...provided.draggableProps} {...provided.dragHandleProps} ref={provided.innerRef}>
                        <ContextMenuContainer 
                                key={topic.id} contextId={topic.id} contextItems={topicContextItems}
                                disabled={beingEdited[topic.id] ? true : false}>
                            <Menu.Item active={topic.id === currEntry.id}
                                    href={'/editor/' + bookCode + '/' + topic.code} >
                                <Title id={topic.id} title={topic.title} editing={beingEdited[topic.id]}  
                                    index={topic.index}/>
                            </Menu.Item>
                        </ContextMenuContainer>
                    </div>
                )}
            </Draggable>
        )
    }
}

class TopicGroupEditor extends React.Component {
    render() {
        const {group, currEntry, bookCode} = this.props

        return (
            <Draggable draggableId={group.id} index={this.props.index}>
                {provided => (
                    <div {...provided.draggableProps} ref={provided.innerRef}>
                        <div  {...provided.dragHandleProps}>
                            <ContextMenuContainer contextId={group.id} contextItems={groupContextItems}>
                                <Menu.Item name={group.id} className='header' as='a'>
                                    <Title id={group.id} title={group.title} editing={beingEdited[group.id]} index={group.index}/>
                                </Menu.Item>
                            </ContextMenuContainer>
                        </div>

                        <Droppable droppableId={group.id} type='topic'>
                            {provided => (
                                <div ref={provided.innerRef} {...provided.droppableProps}>
                                    {group.topics.map( (topic, index) => (
                                        <TOCTopicEditor index={index} topic={topic} currEntry={currEntry} bookCode={bookCode}/>
                                    ))}
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>
                    </div>
                )}
            </Draggable>
        )
    }
}

export default class TOCEditor extends React.Component {
    constructor( props) {
        super( props);
        this.nuxState = new TOCEditorState( this)
    }

    render() {
        const that = this;
        const {toc} = this.state

        return (
            <Menu secondary vertical pointing>
                <Menu.Item className={'book'}>{that.state.toc.title}</Menu.Item>

                <DragDropContext onDragEnd={this.nuxState.onDragEnd}>
                    <Droppable droppableId='toc' type='topicGroup'>
                        {provided => (
                            <div {...provided.droppableProps} ref={provided.innerRef}>
                                {toc.topicGroups.map( (group, index) => (
                                    <TopicGroupEditor group={group} key={group.id} bookCode={toc.code} 
                                        currEntry={that.props.currEntry} index={index}/>
                                ))}
                                {provided.placeholder}
                            </div>
                        )}
                    </Droppable>
                </DragDropContext>
            </Menu>
        );
    }
}

class TOCEditorState extends ComponentNuxState {
    constructor( component) {
        super( component)
        component.state = this.state = Object.assign( {}, this.state, {toc: cloneDeep( component.props.toc)})
        
        this.onDragEnd = this.onDragEnd.bind( this)
    }

    onDragEnd( result) {
        if( !result.destination) return

        if( result.source.droppableId == result.destination.droppableId 
            && result.source.index == result.destination.index) return

        const topicGroups = this.state.toc.topicGroups
        if( result.type == 'topic') {
            const sourceTopicGroup = find( topicGroups, {id: result.source.droppableId})
            const destTopicGroup = find( topicGroups, {id: result.destination.droppableId})
            const topic = sourceTopicGroup.topics.splice( result.source.index, 1)[0]
            destTopicGroup.topics.splice( result.destination.index, 0, topic)
        } else {
            const topicGroup = topicGroups.splice( result.source.index, 1)[0]
            topicGroups.splice( result.destination.index, 0, topicGroup)
        }

        this.resetIndexes()
        this.component.forceUpdate()
    }

    deleteGroup( groupId) {
        const index = findIndex( this.state.toc.topicGroups, {id: groupId})
        if( index == -1) return

        this.state.toc.topicGroups.splice( index, 1)
        this.component.forceUpdate()
    }

    deleteTopic( topicId) {
        if( topicId == this.state.currEntry.id) return

        for( const topicGroup of this.state.toc.topicGroups) {
            const index = findIndex( topicGroup.topics, {id: topicId})
            if( index == -1) continue

            topicGroup.topics.splice( index, 1)
            this.component.forceUpdate()
            break
        }
    }

    editItem( itemId) {
        beingEdited[ itemId] = true
        this.component.forceUpdate()
    }

    resetIndexes() {
        this.state.toc.topicGroups.map( (topicGroup, groupIndex) => {
            topicGroup.index = `${groupIndex+1}`
            topicGroup.topics.map( (topic, topicIndex) => {
                topic.index = `${groupIndex+1}.${topicIndex+1}`
            })
        })
    }

    addGroup( groupId, beforeAfter) {
        const groupIndex = findIndex( this.state.toc.topicGroups, {id: groupId})
        if( groupIndex == -1) return

        const group = {id: uuidv4(), code: '', title: '', topics: []}
        if( beforeAfter == 'before') {
            this.state.toc.topicGroups.splice( groupIndex, 0, group)
        } else {
            this.state.toc.topicGroups.splice( groupIndex + 1, 0, group)
        }

        this.resetIndexes()
        beingEdited[ group.id] = true
        this.component.forceUpdate()
    }

    addTopic( topicId, beforeAfter) {
        for( const topicGroup of this.state.toc.topicGroups) {
            const topicIndex = findIndex( topicGroup.topics, {id: topicId})
            if( topicIndex == -1) continue

            const topic = {id: uuidv4(), code: '', title: '', topics: []}
            if( beforeAfter == 'before') {
                topicGroup.topics.splice( topicIndex, 0, topic)
            } else {
                topicGroup.topics.splice( topicIndex + 1, 0, topic)
            }

            this.resetIndexes()
            beingEdited[ topic.id] = true
            this.component.forceUpdate()
            break
        }
    }

    addTopicToGroup( groupId) {
        const topicGroups = this.state.toc.topicGroups
        const groupIndex = findIndex( topicGroups, {id: groupId})
        if( groupIndex == -1) return

        const topic = {id: uuidv4(), code: '', title: '', topics: []}
        topicGroups[ groupIndex].topics.splice( topicGroups[ groupIndex].topics.length, 0, topic)

        this.resetIndexes()
        beingEdited[ topic.id] = true
        this.component.forceUpdate()
    }

    getGroupTopicById( id) {
        const topicGroups = this.state.toc.topicGroups
        const groupIndex = findIndex( topicGroups, {id})
        if( groupIndex >= 0) {
            return {topicGroup: topicGroups[groupIndex], topic: null}
        }

        for( const topicGroup of topicGroups) {
            const topicIndex = findIndex( topicGroup.topics, {id})
            if( topicIndex >= 0) {
                return {topicGroup: null, topic: topicGroup.topics[ topicIndex]}
            }
        }

        return { topicGroup: null, topic: null}
    }

    onTocTitleEditingDone( data) {
        delete beingEdited[ data.id]

        const {topicGroup, topic} = this.getGroupTopicById( data.id)
        if( topicGroup) {
            topicGroup.title = data.title
        } else if( topic) {
            topic.title = data.title
        }

        this.component.forceUpdate()
    }

    onContextMenuItemClicked( data) {
        const {contextId, contextItem} = data

        if( contextItem.id == 'delete-topic') {
            this.deleteTopic( contextId)
        } else if( contextItem.id == 'delete-group') {
            this.deleteGroup( contextId)
        } else if( contextItem.id == 'edit-topic' || contextItem.id == 'edit-group') {
            this.editItem( contextId)
        } else if( contextItem.id == 'add-group-before') {
            this.addGroup( contextId, 'before')
        } else if( contextItem.id == 'add-group-after') {
            this.addGroup( contextId, 'after')
        } else if( contextItem.id == 'add-topic-in-group') {
            this.addTopicToGroup( contextId)
        } else if( contextItem.id == 'add-topic-before') {
            this.addTopic( contextId, 'before')
        } else if( contextItem.id == 'add-topic-after') {
            this.addTopic( contextId, 'after')
        }
    }
}
