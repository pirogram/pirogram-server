import React from 'react';
import HtmlContent from './html-content.jsx';
import MultipleChoice from './multi-choice.jsx';
import CodeExplorer from './code-explorer.jsx';
import CodingProblem from './coding-problem.jsx';
import CategorizationQuestion from './categorize.jsx';
import QualitativeQuestion from './qualitative.jsx';
import FillInTheBlankQuestion from './fill-in-the-blank.jsx';
import TestlessCodingProblem from './testless-coding-problem.jsx';

export default class Section extends React.Component {
    render() {
        const {section, userId, viewOnly} = this.props;

        if( section.type == 'html') {
            return <HtmlContent html={section.html}/>;
        } else if( section.type == 'multiple-choice-question') {
            return <MultipleChoice userId={userId} id={section.id} index={section.meta.index}
                question={section.question} options={section.options} starterCode={section.starterCode} 
                userCode={section.userCode} viewOnly={viewOnly}
                correctIds={section.correctIds} selectedIds={section.selectedIds} done={section.done} />;
        } else if( section.type == 'live-code') {
            return <CodeExplorer id={section.id}
                chained={section.chained} userId={userId} viewOnly={viewOnly}
                starterCode={section.starterCode} userCode={section.userCode}/>;
        } else if( section.type == 'coding-question') {
            return <CodingProblem id={section.id} index={section.meta.index}
                starterCode={section.starterCode} viewOnly={viewOnly} solutionCount={section.solutionCount}
                userCode={section.userCode} question={section.question} done={section.done}
                referenceSolution={section.referenceSolution} tests={section.tests} userId={userId}/>;
        } else if( section.type == 'testless-coding-question') {
            return <TestlessCodingProblem id={section.id} index={section.meta.index} viewOnly={viewOnly}
                chained={section.chained} userId={userId} starterCode={section.starterCode} 
                solutionCount={section.solutionCount}
                userCode={section.userCode} question={section.question} done={section.done}/>;
        } else if( section.type == 'categorization-question') {
            return <CategorizationQuestion id={section.id} index={section.meta.index}
                question={section.question} done={section.done} starterCode={section.starterCode} 
                userCode={section.userCode} viewOnly={viewOnly}
                categories={section.categories} challenges={section.challenges}
                selectedCategories={section.selectedCategories} correctCategories={section.correctCategories}
                userId={userId}/>;
        } else if( section.type == 'qualitative-question') {
            return <QualitativeQuestion id={section.id} index={section.meta.index} viewOnly={viewOnly}
                question={section.question} done={section.done} answer={section.answer} userId={userId}/>;
        } else if( section.type == 'fill-in-the-blank-question') {
            return <FillInTheBlankQuestion id={section.id} index={section.meta.index} viewOnly={viewOnly}
                question={section.question} starterCode={section.starterCode} userCode={section.userCode}
                labels={section.labels} answers={section.answers} userId={userId} done={section.done}/>;

        }
    }
}