import React from 'react';
import HtmlContent from './html-content.jsx';
import MultipleChoice from './multi-choice.jsx';
//import CodePlayground from './code-content.jsx';

const Topic = ({userId, m, topic}) => (
    <div className="topic">
        {topic.contentList.map( (content, i) => {
            if( content.type == 'html') {
                return <HtmlContent key={i} html={content.html}/>
            } else if( content.type == 'multiple-choice') {
                return <MultipleChoice key={i} userId={userId} id={content.id} compositeId={content.compositeId}
                    question={content.question} code={content.code} choiceOptions={content.choiceOptions}
                    correctIds={content.correctIds} selectedIds={content.selectedIds} done={content.done} />
            } else if( content.type == 'code') {
                return <CodePlayground key={i} lang={content.lang} code={content.code}/>
            }
        })}
    </div>
);

export default Topic;