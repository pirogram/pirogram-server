import React from 'react';
import {Feed} from 'semantic-ui-react';
import Activity from './activity.jsx';

export default class Activities extends React.Component {
    constructor( props) {
        super( props);
    }

    render() {
        return(
            <Feed size='small'>
                {this.props.activities.map((activity, i) => {
                    return <Activity key={i} user={activity.user} p={activity.p} topic={activity.topic} section={activity.section} solution={activity.solution}/>
                })}
            </Feed>
        );
    }
}