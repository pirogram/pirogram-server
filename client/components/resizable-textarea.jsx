import React from 'react';
import PropTypes from 'prop-types';

export default class ResizableTextarea extends React.Component {
	constructor(props) {
		super(props); // id, value, minRows, maxRows, onChange, className, placeholder
		this.state = {
            value: props.value,
            className: props.className || ''
        };

        this.state.className = `${this.state.className} resizable-textarea`
        
        this.adjustHeight = this.adjustHeight.bind( this)
        this.handleChange = this.handleChange.bind( this)
    }
    
    handleChange( event) {
        this.adjustHeight( event.target)
        if( this.props.onChange) {
            this.props.onChange( event.target.value)
        }
    }
	
	adjustHeight( el) {
		const textareaLineHeight = 24;
		const { minRows, maxRows } = this.props;
		
        const previousRows = el.rows;
        //el.rows = minRows;
		
		const currentRows = ~~(el.scrollHeight / textareaLineHeight);
    
        if (currentRows !== previousRows) {
            if( maxRows && currentRows > maxRows) {
                el.rows = maxRows;
                el.scrollTop = el.scrollHeight;
            } else if( currentRows > minRows) {
                el.rows = currentRows;
            } else {
                el.rows = minRows;
            }
        }

        this.setState({
            value: el.value,
            rows: el.rows
        });
    };
    
    componentDidMount() {
        const el = document.getElementById( this.props.id)
        this.adjustHeight( el)
    }
	
	render() {
		return (
			<textarea
                id={this.props.id}
				rows={this.state.rows}
				value={this.state.value}
				placeholder={this.props.placeholder}
				className={this.state.className}
				onChange={this.handleChange}
			/>
		);
	}
}

ResizableTextarea.propTypes = {
    id: PropTypes.string.isRequired,
    value: PropTypes.string,
    className: PropTypes.string,
    placeholder: PropTypes.string,
    minRows: PropTypes.number,
    maxRows: PropTypes.number,
    onChange: PropTypes.func
};