import React from 'react';
import {render} from 'react-dom';
import Header from './components/header.jsx';
import TopicView from './components/topic.jsx';
import TopicEditor from './components/topic-editor.jsx';
import CodeExplorer from './components/sections/code-explorer.jsx';
import {initCodeExecutor} from './code-exec.js';
import Activities from './components/activities.jsx';
import TOC from './components/toc.jsx';
import {Topic} from '../codebook/topic.js'
import TOCEditor from './components/toc-editor.jsx';

initCodeExecutor();

render(<Header user={window.initialStore.user}/>, document.getElementById('turtle-header'));

if( window.initialStore.topic) {
    const topic = Topic.create( window.initialStore.topic)

    if( document.getElementById('topic-content')) {
        render(
            <TopicView userId={window.initialStore.user ? window.initialStore.user.id : 0} 
                topic={topic}/>,
            document.getElementById('topic-content')
        );

        render(
            <TOC toc={window.initialStore.toc} currEntry={window.initialStore.currEntry} />, document.getElementById('toc-content')
        );
    } else if( document.getElementById('topic-content-editor')) {
        render(
            <TopicEditor userId={window.initialStore.user ? window.initialStore.user.id : 0} 
                topic={topic}/>,
            document.getElementById('topic-content-editor')
        );

        render(
            <TOCEditor toc={window.initialStore.toc} currEntry={window.initialStore.currEntry} />, document.getElementById('toc-content')
        );
    }

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