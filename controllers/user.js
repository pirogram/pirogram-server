'use strict';

const Koa = require('koa');
const router = require( 'koa-route');
const models = require( '../models');
import {ensureUser} from '../lib/util';

const userApp = new Koa();

module.exports = { userApp};