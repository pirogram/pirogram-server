import React from 'react';
import ReactDOM from 'react-dom';
import Parser from 'html-react-parser';
import PropTypes from 'prop-types';

export default class HtmlContent extends React.Component {
    render() {
        return (
            <div>
                {Parser(this.props.html)}
            </div>
        )
    }
}

HtmlContent.PropTypes = {
    html: PropTypes.string.isRequired,
};