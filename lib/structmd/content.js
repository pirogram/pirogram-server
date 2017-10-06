'use strict';

export class Content {
    id;
}


export class MarkdownContent extends Content {
    markdown = '';
}


export class CodeContent extends Content {
    lang = 'python';
    code = '';
}


export class MultipleChoiceContent extends Content {
    question = '';
    code = '';
    choiceOptions = [];
    correctIds = [];
    isExercise = true;

    addChoiceOption(id, markdown, isCorrect) {
        this.choiceOptions.push({id, markdown});

        if(isCorrect) { this.correctIds.push(id); }
    }
}


export class CodingProblemContent extends Content {
    problemStatement;
    starterCode;
    referenceSolution;
    tests;
    isExercise = true;
}


export class FibOption {
    name;
    solution;
    testRegex;
    isDropdown;
    dropdownOptions;

    constructor(name, solution, testRegex, isDropdown, dropdownOptions) {
        this.name = name;
        this.solution = solution;
        this.testRegex = testRegex;
        this.isDropdown = isDropdown;
        this.dropdownOptions = dropdownOptions;
    }
}


export class TextFibContent extends Content {
    markdown;
    fibOptions = {};
    isExercise = true;

    addFibOption(fibOption) {
        this.fibOptions.set(fibOption.name, fibOption);
    }
}