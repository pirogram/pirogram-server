import React from 'react';
import Parser from 'html-react-parser';

export default class CodeOutput extends React.Component {
    render() {
        const output = this.props.output;
        if( !output || !output.length) { return null; }

        return (
            <div className='output'>
                <div className='block-name'>output</div>
                {output.map( (item, i) => {
                    if( item.name == 'stdout' || item.name == 'stderr') {
                        return <pre>{item.text}</pre>
                    } else if( item.name == 'object') {
                        if( item.data['image/png']) {
                            return <img className='ui image' src={'data:image/png;base64,' + item.data['image/png']}/>
                        }
                    } else if( item.name == 'traceback') {
                        return <pre className='traceback'>{Parser(item.data.traceback)}</pre>
                    }
                })}
            </div>
        );
    }
}