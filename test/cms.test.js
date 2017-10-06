'use strict';

const cms = require('../cms');
const fs = require('fs-extra');
const config = require('config');
const ROOTDIR = config.get('cms.rootdir');

beforeEach(() => {
    return fs.emptyDir(ROOTDIR);
})

test.skip('dummy', () => {});

// test('create new module', () => {
//     const m = await cms.createModule( 'test', 'Test');
// 
//     expect(m.slug).toBe('test');
//     expect(m.name).toBe('Test');
//     expect(m.id).toBe('test');
//     expect(m.toc.length).toBe(1);
//     expect(m.toc[0].name).toBe('Introduction');
//     expect(m.toc[0].tocName).toBe('Introduction');
//     expect(m.toc[0].slug).toBe('introduction');
// })