import React from 'react';
import {Feed, Icon} from 'semantic-ui-react';
import Section from './section.jsx';

export default class Activity extends React.Component {
    constructor( props) {
        super( props);
    }

    render() {
        return(
            <Feed.Event>
                <Feed.Label>
                    <img src={this.props.user.avatar} />
                </Feed.Label>
                <Feed.Content>
                    <Feed.Summary>
                        <Feed.User href={'/activities?username=' + this.props.user.username}>{this.props.user.username}</Feed.User> completed <a href={'/@' + this.props.p.meta.code + '/' + this.props.topic.meta.code + '#' + this.props.section.id}>exercise {this.props.section.meta.index}</a> 
                        <Icon name='angle left'/>
                        <a href={'/@' + this.props.p.meta.code + '/' + this.props.topic.meta.code}>{this.props.topic.meta.title}</a> 
                        <Icon name='angle left'/>
                        <a href={'/@' + this.props.p.meta.code}>{this.props.p.meta.title}</a>
                    </Feed.Summary>
                    <Feed.Extra>
                        <Section section={this.props.section} userId={this.props.user.id} viewOnly={true}/>
                    </Feed.Extra>
                </Feed.Content>
            </Feed.Event>
        );
    }
}