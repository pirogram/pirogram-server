import React from 'react';

export default class CodeOutput extends React.Component {
    render() {
        const output = this.props.output;
        if( !output || !output.length) { return null; }

        return (
            <div className='output'>
                <div className='block-name'>output</div>
                {output.map( (item, i) => {
                    if( item.stream == 'stdout' || item.stream == 'stderr') {
                        return <pre>{item.content}</pre>
                    } else if( item.stream == 'matplotlib') {
                        return <img className='ui image' src={'data:image/png;base64,' + item.content}/>
                    }
                })}
            </div>
        );
    }
}