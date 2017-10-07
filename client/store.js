'use strict';

export class HtmlContentStore {
    type = 'html';
    html;
}

export class ChoiceOptionStore {
    id;
    html;
}

export class MultipleChoiceContentStore {
    type = 'multiple-choice';
    id;
    compositeId;
    question;
    code;
    choiceOptions = [];
    correctIds = [];
    selectedIds = [];
    done = false;
    isExercise = true;
}

export class CodePlaygroundContentStore {
    type = 'code-playground';
    id;
    compositeId;
    commentary;
    code;
    hasError = false;
}

export class TopicStore {
    slug;
    name;
    tocName;
    contentList = [];
}

export class ModuleStore {
    slug;
    name;
}

export class PageStore {
    m;
    topic;
}