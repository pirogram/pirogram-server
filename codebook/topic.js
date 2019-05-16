const {filter} = require('lodash');
const {Section} = require('./section');

export class Topic {
    constructor( bookCode, data, sections) {
        this.bookCode = bookCode;
        this.code = data.code;
        this.title = data.title;
        this.index = data.index;
        this.filename = data.filename;
        this.isgroup = data.isgroup;
        this.sections = sections || [];
    }

    clone() {
        return new Topic(this.bookCode, this, this.sections.map((s, i) => s.clone()));
    }

    initSections( docs) {
        let index = 1;

        this.sections = filter( docs, (s) => { return s != null;}).map((s,i) => {
            if( typeof( s) == "string") {
                s = {type: "markdown", text: s};
            }

            if( s.type != 'markdown' && s.type != 'live-code') {
                s.index = `${this.index}.${index}`
                index += 1;
            }
    
            return new Section(this.bookCode, this.code, s);
        });
    }

    setIndex( index) {
        this.index = index
        
        let exerciseId = 1
        this.sections.map( (section, i) => {
            if( section.type != 'markdown' && section.type != 'live-code') {
                section.index = `${this.index}.${exerciseId}`
                exerciseId += 1
            }
        })
    }

    get exerciseIds() {
        const exerciseIds = [];
        for( const section of this.sections) {
            if( section.isExercise(section)) { 
                    exerciseIds.push( section.id);
            }
        }
    
        return exerciseIds;
    }
}