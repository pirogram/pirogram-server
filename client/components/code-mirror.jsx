import React from 'react'
import { dispatch } from '../nux';

let CodeMirror = null;
if (typeof window !== 'undefined' && typeof window.navigator !== 'undefined') {
  CodeMirror = require('react-codemirror2').UnControlled;
  require('codemirror/mode/python/python');
  require('codemirror/lib/codemirror.css')
}

export default class CodeMirrorEditor extends React.Component {
    constructor( props) {
        super( props)
        this.state = {currValue: props.value}
        dispatch('EDITOR_CONTENT_CHANGE', {editorId: this.props.id, content: props.value})
        this.onChange = this.onChange.bind( this)
    }

    getValue() {
        return this.state.currValue
    }

    setValue( newValue) {
        this.setState( Object.assign({}, this.state, {currValue: newValue}))
    }

    onChange( editor, data, value) {
        if( this.props.onChange) { 
            this.props.onChange( this.props.id, value) 
        }
        this.state.currValue = value
        dispatch('EDITOR_CONTENT_CHANGE', {editorId: this.props.id, content: value})
    }

    render() {
        return (
            CodeMirror ? <CodeMirror
                value={this.state.currValue}
                options={{
                    mode: 'python',
                    lineNumbers: true,
                    viewportMargin: Infinity,
                    autofocus: this.props.autofocus || false
                }} 
                onChange={this.onChange} /> : null
        )
    }
}