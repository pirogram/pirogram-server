import React from 'react';
import PropTypes from 'prop-types';
import CodePlayground from './code-playground/index.jsx';
import {dispatch} from '../nux';

export default class CodeExplorer extends React.Component {
    constructor( props) {
        super( props);
        this.onExecute = this.onExecute.bind(this);
    }

    onExecute( code) {
        dispatch( 'CODE_EXECUTION_REQUEST', {code, playgroundId: this.props.id});
    }

    render() {
        return (
            <div className='practise-area'>
                <CodePlayground id={this.props.id} userCode={this.props.userCode} starterCode={this.props.starterCode} 
                    executeCmd={this.onExecute}/>
            </div>
        );
    }
}

CodeExplorer.PropTypes = {
    id: PropTypes.string.isRequired,
    userCode: PropTypes.string.isRequired,
    starterCode: PropTypes.string
};