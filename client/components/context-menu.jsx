import React from 'react'
import ReactDOM from "react-dom"
import {Menu} from 'semantic-ui-react';
import {addListener, dispatch} from '../nux';

export default class ContextMenuContainer extends React.Component {
    constructor( props) {
        super( props)
        this.handleContextMenu = this.handleContextMenu.bind( this)
    }

    handleContextMenu(evt) {
        if( this.props.disabled) return
        
        evt.preventDefault()
        dispatch( 'CONTEXT_MENU_DISPLAY', {contextId: this.props.contextId, pageX: evt.pageX, 
            pageY: evt.pageY, contextItems: this.props.contextItems})
    }

    render() {
        return (
            <div onContextMenu={this.handleContextMenu}>
                {this.props.children}
            </div>
        )
    }
}

/* -- */
const contextMenuStyles = {
    wrapper: {
      position: "absolute",
      height: "100%",
      width: "100%",
      zIndex: 99999
    },
    menu: {
      position: "fixed",
      zIndex: 3000,
      width: "auto",
      boxShadow: "0 2px 4px 0 rgba(34,36,38,.12), 0 2px 10px 0 rgba(34,36,38,.15)"
    }
};

class ContextMenu extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
          top: props.pageY,
          left: props.pageX
        };
    }

    componentDidMount() {
        this.updatePosition();
    }
    
    updatePosition = () => {
        const { pageX, pageY } = this.props;
        const menu = this.el.querySelector("[data-id=menu]");
        const menuWidth = menu.offsetWidth;
        const menuHeight = menu.offsetHeight;
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        const left =
          windowWidth - pageX < menuWidth ? windowWidth - menuWidth : pageX;
        const top =
          windowHeight - pageY < menuHeight ? windowHeight - menuHeight : pageY;
    
        if (pageX !== left || pageY !== top) {
          this.setState({ top, left });
        }
    };

    render() {
        const { top, left } = this.state;
        const contextId = this.props.contextId;

        return (
            <div
                ref={el => { this.el = el; }}
                style={contextMenuStyles.wrapper}
                onClick={(e) => {dispatch('CONTEXT_MENU_CLEAR', {})}}
                onContextMenu={evt => {
                    evt.preventDefault();
                    dispatch('CONTEXT_MENU_CLEAR', {})
                }}>
                <Menu
                    vertical
                    data-id="menu"
                    size='small'
                    style={{...contextMenuStyles.menu, top, left}}>
                {this.props.contextItems.map(contextItem => (
                    <Menu.Item
                        content={contextItem.content}
                        style={{ whiteSpace: "nowrap" }}
                        onClick={evt => {
                            evt.stopPropagation()
                            dispatch('CONTEXT_MENU_ITEM_CLICKED', {contextId, contextItem})
                            dispatch('CONTEXT_MENU_CLEAR', {})}}/>
                ))}
                </Menu>
            </div>
        )
    }
}

/* -- */

let listenersRegistered = false
function registerListeners() {
    if( listenersRegistered) return

    //document.body.addEventListener('click', clearContextMenu)
    document.body.addEventListener('keypress', (e) => {
        if( e.defaultPrevented) return
        if( e.keyCode == 27) clearContextMenu()
    })
}

function clearContextMenu() {
    const div = document.getElementById( 'context-menu-anchor')
    if( !div) return

    ReactDOM.unmountComponentAtNode( div)
    div.parentNode.removeChild( div);
}

function getAnchor() {
    const div = document.createElement( 'div')
    div.setAttribute( 'id', 'context-menu-anchor')
    document.body.appendChild( div)

    return div
}

function displayContextMenu( data) {
    clearContextMenu()

    const anchorEl = getAnchor()
    ReactDOM.render(
        <ContextMenu contextId={data.contextId} pageX={data.pageX} pageY={data.pageY} contextItems={data.contextItems} />, anchorEl
    )

    registerListeners()
}

addListener( 'CONTEXT_MENU_DISPLAY', displayContextMenu)
addListener( 'CONTEXT_MENU_CLEAR', clearContextMenu)
