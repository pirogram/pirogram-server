'use strict';

const _ = require('lodash');
const models = require('../models');

const tocList = [{
    "name": "Regex",
    "slug": "regex",
    "topics": [
    {
        "name": "Regex Introduction",
        "slug": "regex-introduction",
        "toc_name": "Introduction",
        "topics": [
            {
                "name": "Regex - Setting the Stage",
                "slug": "regex-setting-the-stage",
                "toc_name": "Setting The Stage"
            },
            {
                "name": "Regex - Problem Statement",
                "slug": "regex-problem-statement",
                "toc_name": "Problem Statement"
            },
            {
                "name": "Regex - Enters the Gibberish",
                "slug": "regex-enters-the-gibberish",
                "toc_name": "Gibberish to Rescue"
            },
            {
                "name": "Regex - The Plan",
                "slug": "regex-the-plan",
                "toc_name": "The Plan"
            }
        ]
    },
    {
        "name": "Regex - Matching Characters",
        "slug": "regex-matching-characters",
        "toc_name": "Matching Characters",
        "topics": [
            {
                "name": "Regex - Matching Literals",
                "slug": "regex-matching-literals",
                "toc_name": "Literals"
            },
            {
                "name": "Regex - Matching Special Characters",
                "slug": "regex-matching-special-characters",
                "toc_name": "Special Characters"
            },
            {
                "name": "Regex - Matching This or That",
                "slug": "regex-matching-this-or-that",
                "toc_name": "This or That"
            },
            {
                "name": "Regex - Matching One of Many Characters",
                "slug": "regex-matching-one-of-many-characters",
                "toc_name": "One of Many"
            },
            {
                "name": "Regex - Matching Types of Characters",
                "slug": "regex-matching-types-of-characters",
                "toc_name": "Types"
            }
        ]
    },
    {
        "name": "Regex - Matching Occurrences or Repetitions",
        "slug": "regex-matching-occurrences-or-repetitions",
        "toc_name": "Matching Repetitions",
        "topics": [
            {
                "name": "Regex - Matching m To n Occurrence",
                "slug": "regex-matching-m-to-n-occurrence",
                "toc_name": "m to n"
            },
            {
                "name": "Regex - ?",
                "slug": "regex-matching-0-or-1-occurrences",
                "toc_name": "?"
            },
            {
                "name": "Regex - *",
                "slug": "regex-matching-0-or-more-occurrences",
                "toc_name": "*"
            },
            {
                "name": "Regex - +",
                "slug": "regex-matching-1-or-more-occurrences",
                "toc_name": "+"
            }
        ]
    },
    {
        "name": "Regex - Matching Boundaries",
        "slug": "regex-matching-boundaries",
        "toc_name": "Matching Boundaries",
        "topics": [
            {
                "name": "Regex - Matching Word Boundaries",
                "slug": "regex-matching-word-boundaries",
                "toc_name": "Word"
            },
            {
                "name": "Regex - Matching Line Boundaries",
                "slug": "regex-matching-line-boundaries",
                "toc_name": "Line"
            }
        ]
    },
    {
        "name": "Regex - Beyond Match",
        "slug": "regex-beyond-match",
        "toc_name": "Beyond Match",
        "topics": [
            {
                "name": "Regex - Extract Content (Full Match)",
                "slug": "regex-extract-content-full-match",
                "toc_name": "Extract Full Match"
            },
            {
                "name": "Regex - Extract Content (Nested Groups)",
                "slug": "regex-extract-content-nested-groups",
                "toc_name": "Extract Nested Groups"
            },
            {
                "name": "Regex - Extract Content (Named Groups)",
                "slug": "regex-extract-content-named-groups",
                "toc_name": "Extract Named Groups"
            },
            {
                "name": "Regex - Split/FindAll",
                "slug": "regex-split-findall-content",
                "toc_name": "Split/FindAll"
            }
        ]
    }
]
}];

async function lookupToc( slug) {
    let toc = null;
    for( let item of tocList) {
        if( item.slug == slug) {
            toc = item;
            break;
        }
    }

    if( toc) {
        if( !toc.slugs) {
            toc.slugs = [];
            toc.topicIds = [];
      
            for( let item of toc.topics) {
                let topic = await models.getTopicBySlug(item.slug);
                item.id = topic.attributes.id;
                toc.slugs.push(topic.attributes.slug);
                toc.topicIds.push(topic.attributes.id);

                if( item.topics) {
                    for( let itemTopic of item.topics) {
                        topic = await models.getTopicBySlug(itemTopic.slug);
                        itemTopic.id = topic.attributes.id;
                        toc.slugs.push( topic.attributes.slug);
                        toc.topicIds.push(topic.attributes.id);
                    }
                }
            }
        }

        return _.cloneDeep(toc);
    }

    throw new Error( `toc ${slug} not found`);
}

module.exports = { tocList, lookupToc};