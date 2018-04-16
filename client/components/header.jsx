import React from 'react';
import {Image, Menu, Dropdown} from 'semantic-ui-react';

export default class Header extends React.Component {
    render() {
        let auth;
        const about = <Menu.Item href="/about" className="not last" name="about"/>;

        if( this.props.user && this.props.user.name) {
            auth =
                <Menu.Item>
                    <Dropdown text={this.props.user.name} pointing>
                        <Dropdown.Menu>
                            <Dropdown.Item href="/account/update">Update Account</Dropdown.Item>
                            <Dropdown.Item href="/logout">Logout</Dropdown.Item>
                        </Dropdown.Menu>
                    </Dropdown>
                </Menu.Item>;
        } else {
            auth = 
                <Menu.Item>
                    <Dropdown text="Login" pointing>
                        <Dropdown.Menu>
                            <Dropdown.Item href="/login-with-github">With GitHub</Dropdown.Item>
                            <Dropdown.Item href="/login-with-google">With Google</Dropdown.Item>
                            <Dropdown.Item href="/login">With Password</Dropdown.Item>
                        </Dropdown.Menu>
                    </Dropdown>
                </Menu.Item>;
        }

        return(
            <div className="pirogram-header">
                <Menu text size="small">
                    <Menu.Item href="/" className="logo"><Image className="logo" src="/static/img/pirogram-logo.png"></Image></Menu.Item>
                    <Menu text size="small" className="right">
                        <Menu.Item href="/study-queue">Your Queue</Menu.Item>
                        {this.props.user && this.props.user.superuser ?
                            <Menu.Item href="/modules">Modules</Menu.Item> : null}
                        {auth}
                    </Menu>
                </Menu>
            </div>
        )
    }
}