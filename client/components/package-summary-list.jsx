import React from 'react';
import ModuleSummary from './package-summary.jsx';

export default class ModuleSummaryList extends React.Component {
    render() {
        return (
            <div className='package-summary-list'>
                {this.props.packageList.map( (p, i) => {
                    return <ModuleSummary key={i} code={p.code} title={p.title} description={p.description}
                        queued={p.queued} done={p.done} />
                })}
            </div>
        );
    }
}