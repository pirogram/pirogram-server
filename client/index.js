import React from 'react';
import ReactDOM from 'react-dom';
import Header from './components/header.jsx';
import Topic from './components/topic.jsx';
import TopicEditor from './components/topic-editor.jsx';

ReactDOM.render(<Header user={window.initialStore.user}/>, document.getElementById('turtle-header'));

if( window.initialStore.topicViewer) {
    ReactDOM.render(<Topic tocSlug={window.initialStore.tocSlug} topicSlug={window.initialStore.topicSlug}
        topic={window.initialStore.topic} user={window.initialStore.user}/>, 
        document.getElementById('topic-content'));
}

if( window.initialStore.topicEditor) {
    ReactDOM.render(<TopicEditor title={window.initialStore.title} markdown={window.initialStore.markdown}/>, document.getElementById('topic-editor'));
}