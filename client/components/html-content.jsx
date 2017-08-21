import React from 'react';
import ReactDOM from 'react-dom';
import Parser from 'html-react-parser';
import hljs from 'highlightjs';

export default class HtmlContent extends React.Component {
    constructor(props) {
        super(props);
        this.highlightCode = this.highlightCode.bind(this);
    }

    componentDidMount() {
        this.highlightCode();
    }
    
    componentDidUpdate() {
        this.highlightCode();
    }

    highlightCode() {
        /* No client side rendering as of now. */
        return;

        const domNode = ReactDOM.findDOMNode(this);
        const nodes = domNode.querySelectorAll('pre code');

        let i;
        for (i = 0; i < nodes.length; i++) {
            if( nodes[i].className && nodes[i].className.indexOf('language-') >= 0) {
                hljs.highlightBlock(nodes[i]);
            }
            nodes[i].className += ' hljs';
        }
    }

    render() {
        return (
            <div>
                {Parser(this.props.content.html)}
            </div>
        )
    }
}