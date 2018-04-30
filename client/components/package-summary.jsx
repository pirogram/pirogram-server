import React from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import {ComponentNuxState, dispatch} from '../nux';
import {Menu, Icon, Card} from 'semantic-ui-react';
import Parser from 'html-react-parser';

export default class PackageSummary extends React.Component {
    constructor(props) {
        super( props);
        this.nuxState = new PackageSummaryState( this);
        this.state = this.nuxState.state;
        this.removeFromQueue = this.removeFromQueue.bind(this);
        this.addToQueue = this.addToQueue.bind(this);
    }

    addToQueue(e) {
        e.preventDefault();
        dispatch('PACKAGE_ADD_TO_QUEUE', {code: this.state.code});
    }

    removeFromQueue(e) {
        e.preventDefault();
        dispatch('PACKAGE_REMOVE_FROM_QUEUE', {code: this.state.code});
    }

    render() {
        return (
            <Card className="package-summary">
                <Card.Content>
                    <Card.Header as='a' href={`/@${this.state.author}/${this.state.code}`}>{this.state.title}{this.state.status == 'draft' ? ' (Draft)' : null}</Card.Header>
                    <Card.Meta>by {this.state.author}</Card.Meta>
                </Card.Content>
                <Card.Content>
                    <Card.Description>{this.state.description}</Card.Description>
                </Card.Content>
            </Card>
            /*<div className='package-summary'>
                <h3><a href={`/@${this.state.author}/${this.state.code}`}>{this.state.title}</a>
                    {this.state.userId ? <span className='toolbar'>
                        {this.state.queued ? 
                            <a className='action' href={`/@${this.state.author}/${this.state.code}/from-from-queue`}  
                                onClick={this.removeFromQueue}><Icon name={this.state.modifyingQueue ? 'wait' : 'remove circle'}/>remove from your queue</a> : 
                            <a className='action' href={`/@${this.state.author}/${this.state.code}/add-to-queue`} 
                                onClick={this.addToQueue}><Icon name={this.state.modifyingQueue ? 'wait' : 'add circle'}/>add to your queue</a>}
                    </span> : null}
                </h3>
                <p>{this.state.description}</p>
            </div>*/
        );
    }
}

PackageSummary.propTypes = {
    author: PropTypes.string.isRequired,
    code: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    status: PropTypes.string.isRequired,
    queued: PropTypes.bool,
    done: PropTypes.bool
};

class PackageSummaryState extends ComponentNuxState {
    constructor( component) {
        super( component);

        this.state = {...this.state, modifyingQueue: false};
        if( this.state.description.length > 200) {
            this.state.description = this.state.description.slice(0, 197) + "...";
        }
        component.state = this.state;
    }

    onPackageAddToQueue(data) {
        if( this.state.modifyingQueue) { return; }
        if( this.state.code != data.code) { return; }

        const self = this;

        axios.post(`/@${this.state.author}/${this.state.code}/add-to-queue`)
        .then(function(response) {
            self.setState( Object.assign({}, self.state, {modifyingQueue: false, queued: true}));
        }).catch(function() {
            self.setState( Object.assign({}, self.state, {modifyingQueue: false}));
        });

        this.setState( Object.assign({}, this.state, {modifyingQueue: true}));
    }

    onPackageRemoveFromQueue(data) {
        if( this.state.modifyingQueue) { return; }
        if( this.state.code != data.code) { return; }

        const self = this;

        axios.post(`/@${this.state.author}/${this.state.code}/from-from-queue`)
        .then(function(response) {
            self.setState( Object.assign({}, self.state, {modifyingQueue: false, queued: false}));
        }).catch(function() {
            self.setState( Object.assign({}, self.state, {modifyingQueue: false}));
        });

        this.setState( Object.assign({}, this.state, {modifyingQueue: true}));
    }
}