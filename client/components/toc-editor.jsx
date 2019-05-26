import React from 'react';
import {Menu} from 'semantic-ui-react';
import ContextMenuContainer from './context-menu.jsx'

export default class TOCEditor extends React.Component {
    constructor( props) {
        super( props);
    }

    render() {
        const that = this;
        const contextItems = [
            {content: "Add Above", id: 'add-above'},
            {content: "Add Below", id: 'add-below'},
            {content: "Edit", id: 'edit'},
            {content: "Delete", id: 'delete'},
        ]
        return (
            <Menu secondary vertical pointing>
                <Menu.Item className={'book'}>{that.props.toc.title}</Menu.Item>

                {this.props.toc.topicGroups.map( (group, index) => {
                    return (
                        <div key={index}>
                            <ContextMenuContainer contextId={group.index} contextItems={contextItems}>
                                <Menu.Item key={index} name={group.index} className='header' as='a'>
                                    {group.index + '.  ' + group.title}
                                </Menu.Item>
                            </ContextMenuContainer>

                            {group.topics.map( (topic, i) => {
                                return (
                                    <ContextMenuContainer contextId={topic.index} contextItems={contextItems}>
                                        <Menu.Item 
                                            key={i} active={topic.index === that.props.currEntryIndex.jointIndex}
                                            href={'/editor/' + that.props.toc.code + '/' + topic.code} >
                                                {topic.index + '  ' + topic.title}
                                        </Menu.Item>
                                    </ContextMenuContainer>
                                )
                            })}
                        </div>
                    );


                })}
            </Menu>
        );
    }

    
}
