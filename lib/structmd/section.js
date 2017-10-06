'use strict';

import {Content, MarkdownContent, CodeContent, 
    CodingProblemContent, MultipleChoiceContent, FibOption, TextFibContent} from './content'

export class Section {
    name;
    children = [];
    rawContentLines = [];
    meta = {};

    constructor(name) {
        this.name = name;
        this.children = [];
        this.rawContentLines = [];
    }

    addMeta( key, value) {
        this.meta[key] = value;
    }

    addRawContentLine(line) {
        this.rawContentLines.push(line);
    }

    addChild(child) {
        this.children.push(child);
    }
}


function copyId(section, content) {
    content.id = section.meta['id'];
}


function buildMarkdownContent(s) {
    const c = new MarkdownContent();

    copyId(s, c);
    c.markdown = s.rawContentLines.join('\n');

    return c;
}


function buildCodeContent(s) {
    const c = new CodeContent();

    copyId(s, c);
    c.code = s.rawContentLines.join('\n');
    c.lang = s.meta['lang'] || c.lang;

    return c;
}


export function buildMultipleChoice(s) {
    const c = new MultipleChoiceContent();

    copyId(s, c);
    if(s.children.length < 2
            || s.children[0].name != 'question'
            || s.children[s.children.length-1].name != 'options') {
        return c;
    }

    c.question = s.children[0].rawContentLines.join('\n');

    if(s.children[1].name == 'code') {
        c.code = s.children[1].rawContentLines.join('\n');
    }

    const optionSection = s.children[s.children.length-1];
    const reOption = /^\s*\[(\*|\s)\]\s/;

    let line = null;
    let optionId = 1;
    for( line of optionSection.rawContentLines) {
        line = line.trim();
        if(reOption.exec(line)) {
            const id = optionId.toString();
            const isCorrect = line[1] === '*';
            c.addChoiceOption(id, line.slice(3).trim(), isCorrect);

            optionId += 1;
        }
    }

    return c;
}


function getSectionByName(sectionList, name) {
    for( const s of sectionList) {
        if(s.name == name) return s;
    }

    return new Section(name);
}


function buildCodingProblemContent(s) {
    const c = new CodingProblemContent();

    copyId(s, c);

    const markdownSection = getSectionByName(s.children, 'markdown');
    c.problemStatement = markdownSection.rawContentLines.join('\n');

    c.starterCode = getSectionByName(s.children, 'starter-code').rawContentLines.join('\n');
    c.referenceSolution = getSectionByName(s.children, 'solution').rawContentLines.join('\n');
    c.tests = getSectionByName(s.children, 'tests').rawContentLines.join('\n');

    return c;
}


function buildTextFibContent(s) {
    const c = new TextFibContent();
    copyId(s, c);

    if(s.children.length == 0) return c;

    let markdown = s.children[0].rawContentLines.join('\n');
    c.markdown = markdown;

    const reFib = /\b__fib_(\S+)__\b/;
    while(1) {
        const result = reFib.exec(markdown);
        if(!result) break;

        const fibName = result[1];
        const fibLength = result[0].length;
        const fibIndex = result.index;
        const fibSection = getSectionByName(s.children, fibName);
        const fibOption = new FibOption(name=fibName, solution=fibSection.meta['solution'] || '',
                            testRegex=fibSection.meta['test-regex'] || '',
                            isDropdown=false, dropdownOptions=[]);
        
        if(fibSection.meta['dropdown-options']) {
            fibOption.isDropdown = true;
            const options = fibSection.meta['dropdown-options'] || '';
            for(const opt of options.split(',')) {
                fibOption.dropdownOptions.push(opt.trim());
            }
        }

        c.addFibOption(fibOption);
    }

    return c;
}


export function buildContent(sectionList) {
    const contentList = [];

    for(const s of sectionList) {
        if(s.name == 'markdown') {
            contentList.push(buildMarkdownContent(s));
        } else if( s.name == 'code') {
            contentList.push(buildCodeContent(s));
        } else if( s.name == 'multiple-choice') {
            contentList.push(buildMultipleChoice(s));
        } else if( s.name == 'coding-problem') {
            contentList.push(buildCodingProblemContent(s));
        } else if( s.name == 'text-fib') {
            contentList.push(buildTextFibContent(s));
        }
    }

    return contentList;
}