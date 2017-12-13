import React from 'react';
import { Message, Icon } from 'semantic-ui-react'

export default class CodeStatus extends React.Component {
    render() {
        const status = this.props.status;


        let html = null;
        let statusClass = 'info';

        if( status == 'inprogress' || status == 'queued') {
            html = <div className='ui active small inline loader'></div> ;
        } else if( status == 'failure') {
            html = 'There was an error in executing the code.';
            statusClass = 'error';
        } else if( status == 'session-dead') {
            html = 'Failed to executed code.';
            statusClass = 'error';
        } else if( status == 'require-login') {
            html = <div>Please <a href='/login'>login with Google</a> to execute code.</div>;
            statusClass = 'error';
        }

        return (
            html ? 
            <div className={`code-status ${statusClass}`}>
                <div className='block-name'>status</div>
                {html}
            </div> : null 
        );
    }
}