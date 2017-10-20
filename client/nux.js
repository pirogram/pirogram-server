'use strict';

const stateObjs = [];
const listeners = {};

export class ComponentNuxState {
    constructor( component) {
        this.component = component;
        this.state = Object.assign({}, component.props);
        stateObjs.push( this);
    }

    updateState() {
        this.component.setState( this.state);
    }

    setState( newState) {
        this.state = newState;
        this.updateState();
    }
}


function getHandlerName( eventName) {
    const arr = eventName.split('_');
    const newArr = ['on'];
    for( const item of arr) {
        newArr.push( item.charAt(0).toUpperCase() + item.slice(1).toLowerCase());
    }

    return newArr.join('');
}


export function dispatch( eventName, data) {
    const handlerName = getHandlerName( eventName);
    for( const stateObj of stateObjs) {
        if( stateObj[handlerName]) {
            stateObj[handlerName]( data);
        }
    }

    if( listeners[ eventName]) {
        for( const listener of listeners[eventName]) {
            listener( data);
        }
    }
}


export function addListener( eventName, cb) {
    if( !listeners[ eventName]) {
        listeners[ eventName] = [cb];
    } else {
        listeners[ eventName].push(cb);
    }
}