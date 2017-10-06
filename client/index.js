import React from 'react';
import ReactDOM from 'react-dom';
import Header from './components/header.jsx';
import Topic from './components/topic.jsx';
import TopicEditor from './components/topic-editor.jsx';

ReactDOM.render(<Header user={window.initialStore.user}/>, document.getElementById('turtle-header'));

if( window.initialStore.topicViewer) {
    ReactDOM.render(<Topic moduleSlug={window.initialStore.moduleSlug} topicSlug={window.initialStore.topicSlug}
        pageContentList={window.initialStore.pageContentList} userId={window.initialStore.userId}/>, 
        document.getElementById('topic-content'));
}