import React from 'react';
import HtmlContent from './html-content.jsx';
import MultipleChoice from './multi-choice.jsx';
import CodeExplorer from './code-explorer.jsx';
import CodingProblem from './coding-problem.jsx';
import CategorizationQuestion from './categorize.jsx';
import QualitativeQuestion from './qualitative.jsx';
import FillInTheBlankQuestion from './fill-in-the-blank.jsx';
import TestlessCodingProblem from './testless-coding-problem.jsx';

const Topic = ({userId, m, topic}) => (
    <div className='topic-sections'>
        {topic.sections.map( (section, i) => {
            if( section.type == 'html') {
                return <HtmlContent key={i} html={section.html}/>
            } else if( section.type == 'multiple-choice-question') {
                return <MultipleChoice key={i} userId={userId} id={section.id} compositeId={section.compositeId}
                    question={section.question} options={section.options} starterCode={section.starterCode} 
                    userCode={section.userCode}
                    correctIds={section.correctIds} selectedIds={section.selectedIds} done={section.done} />
            } else if( section.type == 'live-code') {
                return <CodeExplorer key={i} id={section.id} compositeId={section.compositeId} 
                    chained={section.chained} userId={userId}
                    starterCode={section.starterCode} userCode={section.userCode}/>
            } else if( section.type == 'coding-question') {
                return <CodingProblem key={i} id={section.id} compositeId={section.compositeId} 
                    starterCode={section.starterCode}
                    userCode={section.userCode} question={section.question} done={section.done}
                    referenceSolution={section.referenceSolution} tests={section.tests} userId={userId}/>
            } else if( section.type == 'testless-coding-question') {
                return <TestlessCodingProblem key={i} id={section.id} compositeId={section.compositeId} 
                    chained={section.chained} userId={userId} starterCode={section.starterCode} 
                    userCode={section.userCode} question={section.question} done={section.done}/>
            } else if( section.type == 'categorization-question') {
                return <CategorizationQuestion key={i} id={section.id} compositeId={section.compositeId}
                    question={section.question} done={section.done} starterCode={section.starterCode} 
                    userCode={section.userCode}
                    categories={section.categories} challenges={section.challenges}
                    selectedCategories={section.selectedCategories} correctCategories={section.correctCategories}
                    userId={userId}/>
            } else if( section.type == 'qualitative-question') {
                return <QualitativeQuestion key={i} id={section.id} compositeId={section.compositeId}
                    question={section.question} done={section.done} answer={section.answer} userId={userId}/>
            } else if( section.type == 'fill-in-the-blank-question') {
                return <FillInTheBlankQuestion key={i} id={section.id} compositeId={section.compositeId}
                    question={section.question} starterCode={section.starterCode} userCode={section.userCode}
                    labels={section.labels} answers={section.answers} userId={userId} done={section.done}/>

            }
        })}
    </div>
);


export default Topic;