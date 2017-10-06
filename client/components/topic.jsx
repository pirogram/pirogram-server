import React from 'react';
import indexOf from 'lodash/indexOf';
import values from 'lodash/values';
import axios from 'axios';
import HtmlContent from './html-content.jsx';
import MultipleChoiceContent from './multi-choice.jsx';
import CodeContent from './code-content.jsx';
//import RegexQuiz from './regexquiz.jsx';
//import OfflineExercise from './offline-exercise.jsx';

export default class Topic extends React.Component {
    constructor(props) {
        super( props);
    }

    // markQuizAsDone(child, solution) {
    //     axios.post('/exercise/' + child.props.content.id + '/done', {solution})
    //     .catch(function(e) {
    //         console.log('exercise done failed', e);
    //     });

    //     const newState = Object.assign({}, this.state);
    //     newState.done[child.props.content.id] = true;
    //     if( indexOf( values(newState.done), false) == -1) {
    //         this.markTopicAsDone();
    //     }

    //     this.setState(newState);
    // }


    render() {
        return (
            <div className="topic">
                {this.props.pageContentList.map( (pageContent, i) => {
                    if( pageContent.type == 'html') {
                        return <HtmlContent key={i} html={pageContent.html}/>
                    } else if( pageContent.type == 'multiple-choice') {
                        return <MultipleChoiceContent key={i} id={pageContent.id} question={pageContent.question}
                            code={pageContent.code} choiceOptions={pageContent.choiceOptions} userId={this.props.userId}
                            done={pageContent.done} selectedIds={pageContent.selectedIds}/>
                    } else if( pageContent.type == 'code') {
                        return <CodeContent key={i} lang={pageContent.lang} code={pageContent.code}/>
                    }
                })}
            </div>
        );
    }
}