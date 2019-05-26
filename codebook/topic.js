const {filter} = require('lodash');
const {Section} = require('./section');

export class Topic {
    constructor( data, sections) {
        this.code = data.code;
        this.title = data.title;
        this.index = data.index;
        this.sections = sections || [];
    }

    static create( data) {
        const sections = data.sections.map( (s) => new Section(s))
        data.sections = null

        const topic = new Topic( data)
        topic.sections = sections

        return topic
    }

    get filename() {
        return `${this.code}.yaml`
    }

    clone() {
        return new Topic(this, this.sections.map((s, i) => s.clone()));
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
    
            return new Section( s);
        });
    }

    setIndex( index) {
        this.index = index
        this.resetIndex()
    }

    resetIndex() {  
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

    getPlaygroundIds() {
        const plagroundIds = [];
        for( const section of this.sections) {
            if( section.canHaveCodePlayground(section)) { 
                plagroundIds.push( section.id);
            }
        }
    
        return plagroundIds;
    }
    
}