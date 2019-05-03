import React from 'react';
import {render} from 'react-dom';
import Header from './components/header.jsx';
import Topic from './components/topic.jsx';
import CodeExplorer from './components/code-explorer.jsx';
import {initCodeExecutor} from './code-exec';
import Activities from './components/activities.jsx';
import TOC from './components/toc.jsx';

initCodeExecutor();

render(<Header user={window.initialStore.user}/>, document.getElementById('turtle-header'));

if( window.initialStore.topic) {
    render(
        <Topic userId={window.initialStore.user ? window.initialStore.user.id : 0} 
            m={window.initialStore.m} topic={window.initialStore.topic}/>,
        document.getElementById('topic-content')
    );

    render(
        <TOC book={window.initialStore.book} currTopicIndex={window.initialStore.topic.meta.index} currPackageIndex={window.initialStore.p.meta.index} />, document.getElementById('toc-content')
    );
} else if( window.initialStore.hasGeneralCodePlayground) {
    const starterCode = '# code goes here ...\n\n\n';
    render(
        <CodeExplorer id=''
            userId={window.initialStore.user.id} starterCode={starterCode} userCode=''/>,
        document.getElementById('general-code-playground')
    );
} else if( window.initialStore.activities) {
    render(
        <Activities activities={window.initialStore.activities}/>,
        document.getElementById('activities')
    );
}