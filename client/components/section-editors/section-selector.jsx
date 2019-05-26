import React from 'react'
import { dispatch } from '../../nux';
import {Grid, Button} from 'semantic-ui-react';

export default class SectionSelector extends React.Component {
    render() {
        const sectionId = this.props.sectionId

        return (
            <div>
                <Grid columns={4}>
                    <Grid.Row>
                        <Grid.Column><Button size='mini' basic fluid onClick={(e) => { 
                            dispatch('SECTION_TYPE_SELECTED', {sectionId, type: 'markdown'})
                        }}>Markdown</Button></Grid.Column>
                        <Grid.Column><Button size='mini' basic fluid onClick={(e) => { 
                            dispatch('SECTION_TYPE_SELECTED', {sectionId, type: 'live-code'})
                        }}>Code Explorer</Button></Grid.Column>
                        <Grid.Column><Button size='mini' basic fluid onClick={(e) => { 
                            dispatch('SECTION_TYPE_SELECTED', {sectionId, type: 'testless-coding-problem'})
                        }}>Code (w/ Tests)</Button></Grid.Column>
                        <Grid.Column><Button size='mini' basic fluid onClick={(e) => { 
                            dispatch('SECTION_TYPE_SELECTED', {sectionId, type: 'coding-problem'})
                        }}>Code (w/o Tests)</Button></Grid.Column>
                    </Grid.Row>
                    <Grid.Row>
                        <Grid.Column><Button size='mini' basic fluid onClick={(e) => { 
                            dispatch('SECTION_TYPE_SELECTED', {sectionId, type: 'multiple-choice-question'})
                        }}>Multi Choice</Button></Grid.Column>
                        {/*<Grid.Column><Button size='mini' basic fluid onClick={(e) => { 
                            dispatch('SECTION_TYPE_SELECTED', {sectionId, type: 'fill-in-the-blank-question'})
                        }}>Fill in Blanks</Button></Grid.Column>
                        <Grid.Column><Button size='mini' basic fluid onClick={(e) => { 
                            dispatch('SECTION_TYPE_SELECTED', {sectionId, type: 'categorization-question'})
                        }}>Categorize</Button></Grid.Column>*/}
                    </Grid.Row>
                </Grid>
                <br/>
            </div>
        )
    }
}