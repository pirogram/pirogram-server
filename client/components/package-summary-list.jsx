import React from 'react';
import PackageSummary from './package-summary.jsx';

export default class PackageSummaryList extends React.Component {
    render() {
        return (
            <div className='package-summary-list'>
                {this.props.packageList.map( (p, i) => {
                    return <PackageSummary key={i} code={p.code} title={p.title} description={p.description}
                        queued={p.queued} done={p.done} author={p.author} />
                })}
            </div>
        );
    }
}