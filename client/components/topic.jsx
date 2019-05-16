import React from 'react';
import Section from './section.jsx';

const Topic = ({userId, topic}) => (
    <div className='topic-sections'>
        {topic.sections.map( (section, i) => {
            return <Section key={i} section={section} userId={userId} viewOnly={false}/>;
        })}
    </div>
);

export default Topic;