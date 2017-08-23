import React from 'react';
import indexOf from 'lodash/indexOf';
import values from 'lodash/values';
import axios from 'axios';
import HtmlContent from './html-content.jsx';
import McQuiz from './mcquiz.jsx';
import RegexQuiz from './regexquiz.jsx';
import OfflineExercise from './offline-exercise.jsx';

export default class Topic extends React.Component {
    constructor(props) {
        super( props);

        const done = {};
        props.topic.contentList.map( (content, i) => {
            if( content.type == 'mcquiz'
                    || content.type == 'regexquiz'
                    || content.type == 'offline-exercise') {
                done[content.id] = content.done ? true : false;
            }
        })
        this.state = {done};

        this.markQuizAsDone = this.markQuizAsDone.bind(this);
        this.markTopicAsDone = this.markTopicAsDone.bind(this);

        if( this.props.user && values(this.state.done).length == 0) {
            this.markTopicAsDone();
        }
    }

    
    markTopicAsDone() {
        axios.post('/topic/' + this.props.tocSlug + '/' + this.props.topicSlug + '/done')
        .catch(function() {
            console.log('topic done failed');
        });
    }


    markQuizAsDone(child, solution) {
        axios.post('/exercise/' + child.props.content.id + '/done', {solution})
        .catch(function(e) {
            console.log('exercise done failed', e);
        });

        const newState = Object.assign({}, this.state);
        newState.done[child.props.content.id] = true;
        if( indexOf( values(newState.done), false) == -1) {
            this.markTopicAsDone();
        }

        this.setState(newState);
    }


    render() {
        return (
            <div className="topic">
                {this.props.topic.contentList.map( (content, i) => {
                    if( content.type == 'text') {
                        return <HtmlContent key={content.id} content={content}/>
                    } else if( content.type == 'mcquiz') {
                        return <McQuiz key={content.id} content={content} markQuizAsDone={this.markQuizAsDone}
                            user={this.props.user}/>
                    } else if( content.type == 'regexquiz') {
                        return <RegexQuiz key={content.id} content={content} markQuizAsDone={this.markQuizAsDone}
                            user={this.props.user}/>
                    } else if ( content.type == 'offline-exercise') {
                        return <OfflineExercise key={content.id} content={content} markQuizAsDone={this.markQuizAsDone} 
                            user={this.props.user}/>
                    }
                })}
            </div>
        );
    }
}