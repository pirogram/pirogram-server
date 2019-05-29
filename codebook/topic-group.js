'use strict';

export class TopicGroup {
    index

    constructor( id, code, title, topics) {
        this.id = id
        this.code = code;
        this.title = title;
        this.topics = topics || [];
    }

    addTopic( topic) {
        this.topics.push( topic);
        topic.setIndex( `${this.index}.${this.topics.length}`)
    }

    setIndex( index) {
        this.index = index
        this.topics.map( (topic, i) => { 
            topic.setIndex(`${index}.${i+1}`)
        })
    }
}