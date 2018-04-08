import React from 'react';
import HtmlContent from './html-content.jsx';
import MultipleChoice from './multi-choice.jsx';
import CodeExplorer from './code-explorer.jsx';
import CodingProblem from './coding-problem.jsx';
import CategorizationQuestion from './categorize.jsx';
import QualitativeQuestion from './qualitative.jsx';

const Topic = ({userId, m, topic}) => (
    <div className='topic-sections'>
        {topic.sections.map( (section, i) => {
            if( section.type == 'html') {
                return <HtmlContent key={i} html={section.html}/>
            } else if( section.type == 'multiple-choice-question') {
                return <MultipleChoice key={i} userId={userId} id={section.id} compositeId={section.compositeId}
                    question={section.question} choiceOptions={section.choiceOptions}
                    correctIds={section.correctIds} selectedIds={section.selectedIds} done={section.done} />
            } else if( section.type == 'live-code') {
                return <CodeExplorer key={i} id={section.id} compositeId={section.compositeId} 
                    chained={section.chained}
                    starterCode={section.starterCode} userCode={section.userCode}/>
            } else if( section.type == 'coding-question') {
                return <CodingProblem key={i} id={section.id} compositeId={section.compositeId} 
                    starterCode={section.starterCode}
                    userCode={section.userCode} problemStatement={section.problemStatement} done={section.done}
                    referenceSolution={section.referenceSolution} tests={section.tests} userId={userId}/>
            } else if( section.type == 'categorization-question') {
                return <CategorizationQuestion key={i} id={section.id} compositeId={section.compositeId}
                    question={section.question} done={section.done}
                    categories={section.categories} challenges={section.challenges}
                    selectedCategories={section.selectedCategories} correctCategories={section.correctCategories}
                    userId={userId}/>
            } else if( section.type == 'qualitative-question') {
                return <QualitativeQuestion key={i} id={section.id} compositeId={section.compositeId}
                    question={section.question} done={section.done} answer={section.answer} userId={userId}/>
            }
        })}
    </div>
);


export default Topic;