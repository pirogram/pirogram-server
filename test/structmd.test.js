import {parse as parseStructMark, Content, MarkdownContent, CodeContent, 
    CodingProblemContent, MultipleChoiceContent, TextFibContent} from '../lib/structmd';

test('simple markdown content', () => {
    const s = `.. markdown::
this is a test.`;

    const contentList = parseStructMark(s);
    expect(contentList.length).toBe(1);

    const content = contentList[0];
    expect(content).toBeInstanceOf(MarkdownContent);
    const ms = content;
    expect(ms.id).toBe(undefined);
    expect(ms.markdown).toBe('this is a test.');
});


test('default markdown content', () => {
    const s = `.. ::
this is a test.`;

    const contentList = parseStructMark(s);
    expect(contentList.length).toBe(1);
    expect(contentList[0]).toBeInstanceOf(MarkdownContent);
});


test('multi choice', () => {
    const s = `.. multiple-choice::
    .. ::
    Select all true statements about \`Restructured Markdown\`:

    .. options::
    [*] It combines elements of \`reStructuredText\` and \`Markdown\`.
    [*] It's designed for writing educational material.
    [ ] Sections can be nested.
`;

    const contentList = parseStructMark(s);
    expect(contentList.length).toBe(1);
    expect(contentList[0]).toBeInstanceOf(MultipleChoiceContent);

    const content = contentList[0];

    expect(content.question).toBe('Select all true statements about `Restructured Markdown`:\n');
    expect(content.code).toBe('');

    expect(content.correctIds.length).toBe(2);
    expect(content.correctIds).toContain(1);
    expect(content.correctIds).toContain(2);
    expect(content.choiceOptions[0].markdown).toBe(`It combines elements of \`reStructuredText\` and \`Markdown\`.`);
    expect(content.choiceOptions[1].markdown).toBe(`It's designed for writing educational material.`);
    expect(content.choiceOptions[2].markdown).toBe(`Sections can be nested.`);

    expect(content.choiceOptions[0].id).toBe(1);
    expect(content.choiceOptions[1].id).toBe(2);
    expect(content.choiceOptions[2].id).toBe(3);
});


test('multi choice with code', () => {
    const s = `.. multiple-choice::
    .. ::
    What would this code print?

    .. code::
    lang: python

    i = 0
    while(i < 4):
        print(i)
        i += 1

    .. options::
    [*] 0
    [*] 1
    [ ] 4
`;

    const contentList = parseStructMark(s);
    expect(contentList.length).toBe(1);
    expect(contentList[0]).toBeInstanceOf(MultipleChoiceContent);

    const content = contentList[0];

    expect(content.code).toBe('i = 0\nwhile(i < 4):\n    print(i)\n    i += 1\n');
});


test('multiple contentList', () => {
    const s = `.. ::
this is a test.

.. code::
lang: python

i = 0
while(i < 4):
    print(i)
    i += 1
`;

    const contentList = parseStructMark(s);
    expect(contentList.length).toBe(2);
    expect(contentList[0]).toBeInstanceOf(MarkdownContent);
    expect(contentList[1]).toBeInstanceOf(CodeContent);
});