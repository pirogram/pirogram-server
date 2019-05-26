import React from 'react';
import HtmlContent from '../html-content.jsx';
import {Icon} from 'semantic-ui-react';

export default class CodeTests extends React.Component {
    render() {
        if( !this.props.testsHtml || !this.props.testsHtml.length) { return null; }

        return (
            <div className='tests'>
                <div className='block-name'>tests</div>
                {this.props.testsHtml.map( (test, i) => {
                    let icon = null;
                    if( test.result == 'ok') {
                        icon = <Icon name='checkmark' color='green'/>
                    } else if( test.result == 'not-ok') {
                        icon = <Icon name='remove' color='red'/>
                    }

                    return <div key={i} className='test'>
                            {icon} <code><pre><HtmlContent html={test.content}/></pre></code>
                        </div>;
                })}
            </div>
        );
    }
}