'use strict';

import {buildContent, Section} from './section';
import {Content} from './content';
const debug = require('debug')('structmark');

class Parser {
    sectionBeginRe = /^(\s*)..\s(\S*)::$/;
    metaRe = /^(\w+)\s*:\s*(.+)$/;
    sectionStack = [new Section("root")];

    startOfSectionLine(rawContentLine) {
        let depth = 0;
        let sectionName = "";
        let sectionBegins = false;

        const result = this.sectionBeginRe.exec(rawContentLine);

        if(result && result[1].length%4 == 0) {
            depth = result[1].length/4 + 1;
            if( this.newDepthSeemsAppropriate(depth)) {
                sectionName = result[2];
                sectionBegins = true;
            }
        }

        return {sectionBegins, depth, sectionName};
    }


    currentSectionStackDepth() {
        return this.sectionStack.length;
    }


    getCurrentSection() {
        return this.sectionStack[this.sectionStack.length-1];
    }


    currentDepth() {
        return this.sectionStack.length - 1;
    }


    newDepthSeemsAppropriate(depth) {
        return depth - this.currentDepth() <= 1;
    }


    addSectionToStack(newDepth, newSection) {
        let currentDepth = this.sectionStack.length-1;

        while( newDepth < currentDepth + 1) {
            const section = this.sectionStack.pop();
            currentDepth = this.sectionStack.length-1;
        }

        this.sectionStack[this.sectionStack.length-1].addChild(newSection);
        this.sectionStack.push(newSection);
    }


    removeIndentation(rawContentLine, depth) {
        return rawContentLine.slice((depth-1)*4);
    }


    extractMeta(nonIndentedLine) {
        let isMeta = false;
        let key = '';
        let value = '';

        const result = this.metaRe.exec(nonIndentedLine);
        if(result) {
            isMeta = true;
            key = result[1];
            value = result[2];
        }

        return {isMeta, key, value};
    }


    parse(content) {
        const sectionList = [];
        const rawContentLines = content.split(/\r?\n/);

        let isMetaExpected = false;
        for( const rawContentLine of rawContentLines) {
            const {sectionBegins, depth, sectionName} = this.startOfSectionLine(rawContentLine);

            if(!sectionBegins) {
                const currentSection = this.getCurrentSection();
                const nonIndentedLine = this.removeIndentation(rawContentLine, this.currentDepth());

                if( isMetaExpected) {
                    const {isMeta, key, value} = this.extractMeta(nonIndentedLine);

                    if( isMeta) { currentSection.addMeta(key, value); }
                    else {
                        isMetaExpected = false;

                        if(nonIndentedLine.trim() != '') {
                            currentSection.addRawContentLine(nonIndentedLine);
                        }
                    }
                } else {
                    currentSection.addRawContentLine(nonIndentedLine);
                }
            }
            else {
                const currentSection = new Section(sectionName ? sectionName: 'markdown');
                debug('Created section %o', currentSection);

                this.addSectionToStack(depth, currentSection);
                isMetaExpected = true;
            }
        }

        return buildContent(this.sectionStack[0].children);
    }
}

export function parse(content) {
    const parser = new Parser();
    return parser.parse(content);
}