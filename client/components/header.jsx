import React from 'react';
import {Image, Menu, Dropdown} from 'semantic-ui-react';

export default class Header extends React.Component {
    render() {
        let auth;
        if( this.props.user && this.props.user.name) {
            auth =
                <Menu.Item>
                    <Dropdown text={this.props.user.name} pointing>
                        <Dropdown.Menu>
                            <Dropdown.Item href="/logout">Logout</Dropdown.Item>
                        </Dropdown.Menu>
                    </Dropdown>
                </Menu.Item>;
        } else {
            auth = <Menu.Item href="/login" name="about">Login With Google</Menu.Item>;
        }

        return(
            <div className="turtle-header">
                <Menu text size="small">
                    <Menu.Item href="/" className="logo"><Image className="logo" src="/static/img/turtleprogrammer.png"></Image></Menu.Item>
                    <Menu text size="small" className="right">
                        <Menu.Item href="/about" className="not last" name="about"/>
                        {auth}
                    </Menu>
                </Menu>
            </div>
        )
    }
}