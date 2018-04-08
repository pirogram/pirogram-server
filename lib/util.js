const hljs = require('highlight.js');
const flash = require( './flash');
const marked = require('marked');
const globm = require('glob');

const markdownRenderer = new marked.Renderer();
markdownRenderer.code = function(code, language) {
    if( language) {
        code = hljs.highlight(language, code, true).value; 
    }

    return `<pre><code class='lang-${language} hljs'>${code}</code></pre>`;
}

markdownRenderer.hr = function() {
    return `<div class='ui divider'></div>`;
}

markdownRenderer.image = function(href, title, text) {
    return `<img src="${href}" title="${title}" alt="${text}" class="ui image"></img>`;
}

markdownRenderer.table = function( header, body) {
    return `<table class='ui celled striped table'><thead>${header}</thead><tbody>${body}</tbody></table>`;
}

marked.setOptions({
    renderer: markdownRenderer,
    gfm: true,
    tables: true,
    breaks: false,
    pedantic: false,
    sanitize: false,
    smartLists: true,
    smartypants: false
});

export function markdownToHtml( markdown) {
    return marked(markdown);
}

export function ensureUser( ctx) {
    if( !ctx.state.user) {
        ctx.redirect('/login');
        return false; 
    }

    return true;
}

export function ensureSuperuser( ctx) {
    if( !ctx.state.user) { 
        ctx.redirect('/login');
        return false; 
    }

    if( !ctx.state.user.superuser) { 
        flash.addFlashMessage( ctx.session, 'error', 'Sorry, you do not have permission to access this page.');
        ctx.redirect('/'); 
        return false;
    }

    return true;
}

export function glob(pattern) {
    return new Promise( (resolve, reject) => {
        globm(pattern, (err, files) => {
            if( err) { reject(err); }
            else { resolve(files); }
        });
    });
}