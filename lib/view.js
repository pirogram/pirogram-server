'use strict';
require('babel-register')({
    presets: ["es2015", "react", "stage-2"]
});
require('babel-polyfill');
const React = require('react');
const ReactDOMServer = require('react-dom/server');
const HeaderComponent = require('../client/components/header.jsx').default;
const filehashes = require('../filehashes.js');
const util = require('../lib/util.js');

/* Copied and modified from https://github.com/d-band/koa-view */

const resolve = require('path').resolve;
const nunjucks = require('nunjucks');

/**
 * See: http://mozilla.github.io/nunjucks/api.html#configure
 * @param  {[type]} path nunjucks configure path
 * @param  {[type]} opts nunjucks configure opts
 * @return {[type]}      [description]
 */
module.exports = (path, opts) => {
    path = resolve(path || 'views');
    opts = opts || {};
    const ext = '.' + (opts.ext || 'html');
    const env = nunjucks.configure(path, opts);

    const filters = opts.filters || {};
    const globals = opts.globals || {};

    Object.keys(filters).forEach(k => {
        env.addFilter(k, filters[k]);
    });
    Object.keys(globals).forEach(k => {
        env.addGlobal(k, globals[k]);
    });

    env.addFilter('markdown', function(str) {
        return new nunjucks.runtime.SafeString(util.markdownToHtml(str));
    });

    return function view(ctx, next) {
        if (ctx.render) return next();

        const render = nunjucks.render;

        // Render `view` with `locals` and `koa.ctx.state`.
        ctx.render = (view, locals, initialStore={}) => {
            const state = Object.assign({}, ctx.state, locals, {session: ctx.session});
            if( state.user && state.user.name) {
                initialStore.user = {id: state.user.id, name: state.user.name, superuser: state.user.superuser};
            }
            state.initialStore =  JSON.stringify(initialStore);

            state.headerHtml = ReactDOMServer.renderToString(
                React.createElement( HeaderComponent, {user: initialStore.user})
            );

            state.client_bundle_hash = filehashes.client_bundle_hash;

            return new Promise((res, rej) => {
                render(view + ext, state, (err, html) => {
                    if (err) return rej(err);
                    // Render with response content-type, fallback to text/html
                    ctx.type = ctx.type || 'text/html';
                    ctx.body = html;
                    res();
                });
            });
        };

        return next();
    };
};