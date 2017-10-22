import React from 'react';
import HtmlContent from './html-content.jsx';
import MultipleChoice from './multi-choice.jsx';
import CodePlayground from './code-playground.jsx';
import CodingProblem from './coding-problem.jsx';

const Topic = ({userId, m, topic}) => (
    <div className="topic">
        {topic.contentList.map( (content, i) => {
            if( content.type == 'html') {
                return <HtmlContent key={i} html={content.html}/>
            } else if( content.type == 'multiple-choice') {
                return <MultipleChoice key={i} userId={userId} id={content.id} compositeId={content.compositeId}
                    question={content.question} code={content.code} choiceOptions={content.choiceOptions}
                    correctIds={content.correctIds} selectedIds={content.selectedIds} done={content.done} />
            } else if( content.type == 'code-playground') {
                return <CodePlayground key={i} id={content.id} lang={content.lang} code={content.code} userCode={content.userCode}/>
            } else if( content.type == 'coding-problem') {
                return <CodingProblem key={i} id={content.id} starterCode={content.starterCode}
                    problemStatement={content.problemStatement} referenceSolution={content.referenceSolution}
                    tests={content.tests} userId={userId}/>
            }
        })}
    </div>
);

export default Topic;