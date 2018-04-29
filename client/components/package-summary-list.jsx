import React from 'react';
import PackageSummary from './package-summary.jsx';
import {Card} from 'semantic-ui-react';

export default class PackageSummaryList extends React.Component {
    render() {
        return (
            /*<div className='package-summary-list'>*/
            <Card.Group>
                {this.props.packageList.map( (p, i) => {
                    return <PackageSummary key={i} code={p.meta.code} title={p.meta.title} 
                        description={p.meta.description}
                        queued={p.meta.queued} done={p.meta.done} author={p.meta.author} 
                        userId={this.props.userId} />
                })}
            </Card.Group>
            /*</div>*/
        );
    }
}