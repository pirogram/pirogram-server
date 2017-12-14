import React from 'react';
import PropTypes from 'prop-types';
import CodePlayground from './code-playground/index.jsx';
import {ComponentNuxState, dispatch} from '../nux';

export default class CodeExplorer extends React.Component {
    constructor( props) {
        super( props);
        this.onExecute = this.onExecute.bind(this);

        this.nuxState = new CodeExplorerState( this);
        this.state = this.nuxState.state;

        if( this.props.chained) {
            dispatch( 'CODE_EXECUTION_CHAIN_NEW_LINK', {codeExplorer: this});
        }
    }

    onExecute( code) {
        dispatch( 'CODE_EXECUTION_REQUEST', {code, playgroundId: this.props.id, chained: this.props.chained});
    }

    render() {
        return (
            <div className='practise-area'>
                <CodePlayground id={this.props.id} userCode={this.props.userCode} starterCode={this.props.starterCode} 
                    chained={this.props.chained} executeCmd={this.onExecute}/>
            </div>
        );
    }
}

CodeExplorer.PropTypes = {
    id: PropTypes.string.isRequired,
    chained: PropTypes.bool,
    userCode: PropTypes.string.isRequired,
    starterCode: PropTypes.string
};

class CodeExplorerState extends ComponentNuxState {
    constructor(component) {
        super( component);
        this.state.userCode = this.state.userCode || this.state.starterCode;
    }

    onEditorContentChange(data) {
        if( data.editorId != this.state.id) { return; }
        
        this.setState(Object.assign({}, this.state, {userCode: data.content}));
    }
}