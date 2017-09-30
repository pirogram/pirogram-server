const commonmark = require('commonmark');
const cheerio = require('cheerio');
const hljs = require('highlight.js');
const flash = require( './flash');

export function commonmarkToHtml( markdown) {
    const reader = new commonmark.Parser();
    const writer = new commonmark.HtmlRenderer();
    const parsed = reader.parse( markdown);
    let html = writer.render( parsed);

    const $ = cheerio.load( html, { useHtmlParser2:true });
    $('pre code').each((i, elem) => {
        const $this = cheerio(elem);
        const className = $this.attr('class');

        if (className && className.indexOf('language-') >= 0) {
            $this.html( hljs.highlight('python', $this.text(), true).value);
        }

        $this.addClass('hljs');
    });

    html = $.html('body');
    html = html.slice(6, html.length-7);

    return html;
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