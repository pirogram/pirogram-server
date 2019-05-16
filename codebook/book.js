'use strict';

export class Book {
    constructor(data) {
        this.code = data.code;
        this.title = data.title;
        this.description = data.description;
        this.author = data.author;
        this.path = data.path;

        this.topicGroups = data.topicGroups || [];
    }

    getPrevNext( groupIndex, topicIndex) {
        let prevTopic, nextTopic

        const currGroup = this.topicGroups[groupIndex-1]
        const prevGroup = groupIndex != 1 ? this.topicGroups[groupIndex - 2] : null
        const nextGroup = groupIndex != this.topicGroups.length ? this.topicGroups[groupIndex] : null

        if( topicIndex != 1) {
            prevTopic = currGroup.topics[topicIndex-2]
        } else if( prevGroup) {
            prevTopic = prevGroup.topics[prevGroup.topics.length-1]
        }

        if( topicIndex < currGroup.topics.length) {
            nextTopic = currGroup.topics[topicIndex]
        } else if( nextGroup) {
            nextTopic = nextGroup.topics[0]
        }

        return {prevTopic, nextTopic}
    }

    getTopicByCode( topicCode) {
        for( const group of this.topicGroups) {
            for( const topic of group.topics) {
                if( topic.code == topicCode) {
                    return topic
                }
            }
        }

        return null
    }

    addGroup( topicGroup) {
        this.topicGroups.push( topicGroup);
        topicGroup.setIndex(`${this.topicGroups.length+1}`)
    }

    resetIndexes() {
        this.topicGroups.map( (topicGroup, groupIndex) => {
            topicGroup.index = `${groupIndex+1}`
            topicGroup.topics.map( (topic, topicIndex) => {
                topic.index = `${groupIndex+1}.${topicIndex+1}`
                let exerciseIndex = 1
                topic.sections.map( (section, k) => {
                    if( section.isExercise()) {
                        section.index = `${groupIndex+1}.${topicIndex+1}.${exerciseIndex}`
                        exerciseIndex += 1
                    }
                })
            })
        })
    }

    initMeta( data) {
        this.code = data.code;
        this.title = data.title;
        this.description = data.description;
        this.topics = data.topics || [];
    }
}