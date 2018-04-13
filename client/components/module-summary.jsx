import React from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import {ComponentNuxState, dispatch} from '../nux';
import {Menu, Icon} from 'semantic-ui-react';
import Parser from 'html-react-parser';

export default class ModuleSummary extends React.Component {
    constructor(props) {
        super( props);
        this.nuxState = new ModuleSummaryState( this);
        this.state = this.nuxState.state;
        this.removeFromQueue = this.removeFromQueue.bind(this);
        this.addToQueue = this.addToQueue.bind(this);
    }

    addToQueue(e) {
        e.preventDefault();
        dispatch('MODULE_ADD_TO_QUEUE', {code: this.state.code});
    }

    removeFromQueue(e) {
        e.preventDefault();
        dispatch('MODULE_REMOVE_FROM_QUEUE', {code: this.state.code});
    }

    render() {
        return (
            <div className='module-summary'>
                <h3><a href={'/modules/' + this.state.code}>{this.state.title}</a>
                    <span className='toolbar'>
                        {this.state.queued ? 
                            <a className='action' href={'/modules/' + this.state.code + '/remove_from_queue'}  
                                onClick={this.removeFromQueue}><Icon name={this.state.modifyingQueue ? 'wait' : 'remove circle'}/>remove from your queue</a> : 
                            <a className='action' href={'/modules/' + this.state.code + '/add_to_queue'} 
                                onClick={this.addToQueue}><Icon name={this.state.modifyingQueue ? 'wait' : 'add circle'}/>add to your queue</a>}
                    </span>
                </h3>
                <p>{this.state.description}</p>
            </div>
        );
    }
}

ModuleSummary.propTypes = {
    code: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    queued: PropTypes.bool,
    done: PropTypes.bool
};

class ModuleSummaryState extends ComponentNuxState {
    constructor( component) {
        super( component);

        this.state = {...this.state, modifyingQueue: false};
        component.state = this.state;
    }

    onModuleAddToQueue(data) {
        if( this.state.modifyingQueue) { return; }
        if( this.state.code != data.code) { return; }

        const self = this;

        axios.post('/modules/' + self.state.code + '/add-to-queue')
        .then(function(response) {
            self.setState( Object.assign({}, self.state, {modifyingQueue: false, queued: true}));
        }).catch(function() {
            self.setState( Object.assign({}, self.state, {modifyingQueue: false}));
        });

        this.setState( Object.assign({}, this.state, {modifyingQueue: true}));
    }

    onModuleRemoveFromQueue(data) {
        if( this.state.modifyingQueue) { return; }
        if( this.state.code != data.code) { return; }

        const self = this;

        axios.post('/modules/' + self.state.code + '/remove-from-queue')
        .then(function(response) {
            self.setState( Object.assign({}, self.state, {modifyingQueue: false, queued: false}));
        }).catch(function() {
            self.setState( Object.assign({}, self.state, {modifyingQueue: false}));
        });

        this.setState( Object.assign({}, this.state, {modifyingQueue: true}));
    }
}