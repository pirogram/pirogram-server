import React from 'react';
import {Input, Form} from 'semantic-ui-react';
import {dispatch} from '../../nux';

export default class CodeInput extends React.Component {
    constructor(props) {
        super(props);
        this.state = {inputValue: ''};

        this.handleChange = this.handleChange.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
    }

    handleChange(event) {
        this.setState({inputValue: event.target.value});
    }

    handleSubmit(event) {
        event.preventDefault();
        dispatch('CODE_EXECUTION_INPUT_PROVIDED', {playgroundId: this.props.id, 
            inputValue: this.state.inputValue});
    }

    render() {
        return (
            <div className='input-required'>
                <Form inline onSubmit={this.handleSubmit}>
                    <Input ref={input => input && input.focus()} name='user-input' size='mini' 
                        placeholder='Enter Input' fluid value={this.state.value} 
                        onChange={this.handleChange}/>
                </Form>
            </div>
        );
    }
}