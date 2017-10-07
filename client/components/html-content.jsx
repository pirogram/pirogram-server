import React from 'react';
import Parser from 'html-react-parser';
import PropTypes from 'prop-types';

const HtmlContent = ({ html}) => (
    <div>
        {Parser(html)}
    </div>
);

HtmlContent.PropTypes = {
    html: PropTypes.string.isRequired,
};

export default HtmlContent;