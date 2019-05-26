import React from 'react';
import MarkdownEditor from './section-editors/markdown-editor.jsx'
import CodeExplorerEditor from './section-editors/code-explorer-editor.jsx'
import CodingProblemEditor from './section-editors/coding-problem-editor.jsx';
import MultiChoiceEditor from './section-editors/multi-choice-editor.jsx';
import TestlessCodingProblemEditor from './section-editors/testless-coding-problem-editor.jsx';
import SectionSelector from './section-editors/section-selector.jsx'

export default class SectionEditor extends React.Component {
    render() {
        const {section} = this.props;

        if( section.type == 'markdown') {
            return <MarkdownEditor section={section}/>
        } else if( section.type == 'live-code') {
            return <CodeExplorerEditor section={section}/>
        } else if( section.type == 'testless-coding-question') {
            return <TestlessCodingProblemEditor section={section}/>
        } else if( section.type == 'coding-question') {
            return <CodingProblemEditor section={section}/>
        } else if( section.type == 'multiple-choice-question') {
            return <MultiChoiceEditor section={section}/>
        } else if( section.type == 'tbd') {
            return <SectionSelector sectionId={section.id} />
        }  else {
            return null
        }
    }
}