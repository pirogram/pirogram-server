import React from 'react';
import {Menu, Icon} from 'semantic-ui-react';

export default class TOC extends React.Component {
    constructor( props) {
        super( props);
        this.openPackages = {};
        this.openPackages[props.currEntry.groupIndex.toString()] = 1;
        this.state = { openPackages: {}};
    }

    render() {
        const that = this;
        return (
            <Menu secondary vertical pointing>
                <Menu.Item className={'book'}>{that.props.toc.title}</Menu.Item>

                {this.props.toc.topicGroups.map( (group, index) => {
                    return (
                        <div key={index}>
                            <Menu.Item
                                    key={index} 
                                    name={group.index}
                                    className='header' as='a' onClick={(e, data) => {
                                        that.openPackages[data.name] = 1;
                                        that.setState( {openPackages: {...that.openPackages}});
                                    }}>
                                <Icon name={group.done ? 'green checkmark' : 'wait'} />
                                {group.index + '.  ' + group.title}
                            </Menu.Item>

                            {that.openPackages[group.index] ? 
                                group.topics.map( (topic, i) => {
                                    let icon = 'wait';
                                    if( topic.index == that.props.currEntry.jointIndex) { 
                                        icon = 'hand left outline';
                                    } else if( topic.done) {
                                        icon = 'green checkmark';
                                    }
                                    return <Menu.Item 
                                        key={i} active={topic.index === that.props.currEntry.jointIndex}
                                        href={'/@' + that.props.toc.code + '/' + topic.code}>
                                            <Icon name={icon} />
                                            {topic.index + '  ' + topic.title}
                                        </Menu.Item>;
                                }) : null
                            }
                        </div>
                    );


                })}
            </Menu>
        );
    }

    
}
