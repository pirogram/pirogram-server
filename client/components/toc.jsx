import React from 'react';
import {Menu, Icon} from 'semantic-ui-react';

export default class TOC extends React.Component {
    constructor( props) {
        super( props);
        this.openPackages = {};
        this.openPackages[props.currPackageIndex] = 1;
        this.state = { openPackages: {}};
    }

    render() {
        const that = this;
        return (
            <Menu secondary vertical pointing>
                <Menu.Item className={'book'}>{that.props.book.title}</Menu.Item>

                {this.props.book.packages.map( (p, index) => {
                    return (
                        <div>
                            <Menu.Item
                                    key={index} 
                                    name={p.meta.index}
                                    className='header' as='a' onClick={(e, data) => {
                                        that.openPackages[data.name] = 1;
                                        that.setState( {openPackages: {...that.openPackages}});
                                    }}>
                                <Icon name={p.meta.done ? 'green checkmark' : 'wait'} />
                                {p.meta.index + '.  ' + p.meta.title}
                            </Menu.Item>

                            {that.openPackages[p.meta.index] ? 
                                p.topics.map( (topic, i) => {
                                    let icon = 'wait';
                                    if( topic.meta.index == that.props.currTopicIndex) { 
                                        icon = 'hand point left outline';
                                    } else if( topic.meta.done) {
                                        icon = 'green checkmark';
                                    }
                                    return <Menu.Item 
                                        key={i} active={topic.meta.index === that.props.currTopicIndex}
                                        href={'/@' + p.meta.code + '/' + topic.meta.code}>
                                            <Icon name={icon} />
                                            {topic.meta.index + '  ' + topic.meta.title}
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
