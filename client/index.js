import React from 'react';
import {render} from 'react-dom';
import Header from './components/header.jsx';
import Topic from './components/topic.jsx';
import {initCodeExecutor} from './code-exec';
import ModuleSummaryList from './components/module-summary-list.jsx';

initCodeExecutor();

render(<Header user={window.initialStore.user}/>, document.getElementById('turtle-header'));

if( window.initialStore.topic) {
    render(
        <Topic userId={window.initialStore.user ? window.initialStore.user.id : 0} 
            m={window.initialStore.m} topic={window.initialStore.topic}/>,
        document.getElementById('topic-content')
    );
}

if( window.initialStore.moduleList) {
    render(
        <ModuleSummaryList moduleList={window.initialStore.moduleList}/>,
        document.getElementById('react-app-module-list')
    )
}