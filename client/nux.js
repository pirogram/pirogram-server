'use strict';

const stateObjs = [];

export class NuxState {
    constructor( component) {
        this.component = component;
        this.state = Object.assign({}, component.props);
        component.state = this.state;

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
    console.log(handlerName, eventName, data);
    for( const stateObj of stateObjs) {
        console.log( stateObj);
        if( stateObj[handlerName]) {
            stateObj[handlerName]( data);
        }
    }
}