import React from 'react';
import PropTypes from 'prop-types';
import CodePlayground from '../code-playground/index.jsx';
import {ComponentNuxState, dispatch} from '../../nux';

export default class CodeExplorer extends React.Component {
    constructor( props) {
        super( props);

        this.nuxState = new CodeExplorerState( this);
        this.state = this.nuxState.state;
    }

    render() {
        return (
            <CodePlayground id={this.props.id} userCode={this.props.userCode} 
                starterCode={this.props.starterCode} userId={this.props.userId}/>
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