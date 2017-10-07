import React from 'react';
import {render} from 'react-dom';
import Header from './components/header.jsx';
import Topic from './components/topic.jsx';

render(<Header user={window.initialStore.user}/>, document.getElementById('turtle-header'));

if( window.initialStore.topic) {
    render(
        <Topic userId={window.initialStore.user ? window.initialStore.user.id : 0} 
            m={window.initialStore.m} topic={window.initialStore.topic}/>,
        document.getElementById('topic-content')
    );
}