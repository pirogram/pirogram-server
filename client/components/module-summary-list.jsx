import React from 'react';
import ModuleSummary from './module-summary.jsx';

export default class ModuleSummaryList extends React.Component {
    render() {
        return (
            <div className='module-summary-list'>
                {this.props.moduleList.map( (m, i) => {
                    return <ModuleSummary key={i} code={m.code} title={m.title} description={m.description}
                        queued={m.queued} done={m.done} />
                })}
            </div>
        );
    }
}