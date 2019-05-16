'use strict;'
require('babel-register')({
    presets: ["es2015", "react", "stage-2"]
});
require('babel-polyfill');

const Koa = require('koa');
const router = require( 'koa-route');
const _ = require('lodash');
const models = require( '../models');
const {logger} = require('../lib/logger');
const cms = require('../lib/cms');
const contentView = require('../lib/content-view');
import Activities from '../client/components/activities';
const React = require('react');
const ReactDOMServer = require('react-dom/server');

const activityApp = new Koa();

activityApp.use( router.get( '/activities', async function(ctx) {
    const page = parseInt(ctx.request.query.page) || 1;
    const username = ctx.request.query.username;
    const exerciseId = ctx.request.query.exercise_id;
    const params = [20*(page-1)];
    let query = 'SELECT * FROM exercise_history ORDER BY created_at DESC OFFSET $1 LIMIT 20';
    if(username) {
        const forUser = await models.getUserByUsername(username);
        if(forUser) {
            query = 'SELECT * FROM exercise_history WHERE user_id = $2 ORDER BY created_at DESC OFFSET $1 LIMIT 20';
            params.push(forUser.id);
        }
    } else if( exerciseId) {
        query = 'SELECT * FROM exercise_history WHERE exercise_id = $2 ORDER BY created_at DESC OFFSET $1 LIMIT 20';
        params.push(exerciseId);
    }

    const {rows} = await models.query(query, params);
    
    const activities = [];
    for(const row of rows) {
        const [p, topic, section] = cms.getSectionLineageById( row.exercise_id);
        if(!section) {
            logger.emit('activity', {type: 'invalid-exercise-error', exerciseId: row.exercise_id});
            await models.query('DELETE FROM exercise_history WHERE user_id = $1 AND exercise_id=$2', [row.user_id, row.exercise_id]);
            continue;
        }
        const user = await models.getUserById( row.user_id);
        const presentableSection = contentView.makePresentableSection( section);
        contentView.addUserStateToSection( presentableSection, row);
        activities.push( { user: user, p, topic, section: presentableSection, createdAt: row.created_at});
    }

    const activitiesHtml = ReactDOMServer.renderToString(
        <Activities activities={activities}/>
    );

    const prevPage = page > 1 ? page - 1 : 0;
    const nextPage = rows.length == 20 ? page + 1 : 0;

    await ctx.render('activities', {activities, activitiesHtml, prevPage, nextPage, username}, {activities});
}));

module.exports = {activityApp};