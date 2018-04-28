import React from 'react';
import Parser from 'html-react-parser';
import PropTypes from 'prop-types';

export default class HtmlContent extends React.Component {
    render() {
        return (
            <div className='html-content'>
                {this.props.html ? Parser(this.props.html) : 'missing'}
            </div>
        );
    }
}

HtmlContent.PropTypes = {
    html: PropTypes.string.isRequired,
};