const hljs = require('highlight.js');
const flash = require( './flash');
const marked = require('marked');

const markdownRenderer = new marked.Renderer();
markdownRenderer.code = function(code, language) {
    if( language) {
        code = hljs.highlight(language, code, true).value; 
    }

    return `<pre><code class='lang-${language} hljs'>${code}</code></pre>`;
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