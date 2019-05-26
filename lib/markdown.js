const hljs = require('highlight.js');
const MarkdownIt = require('markdown-it')

const md = new MarkdownIt({
    html: true,
    highlight: (str, lang) => {
        if (lang && hljs.getLanguage(lang)) {
            try {
              return '<pre class="hljs"><code>' + hljs.highlight(lang, str, true).value + '</code></pre>';
            } catch (__) {}
          }
      
        return '<pre class="hljs"><code>' + md.utils.escapeHtml(str) + '</code></pre>';
    }
})

const defaultImageRenderer = md.renderer.rules.image
md.renderer.rules.image = function(tokens, idx, options, env, self) {
    tokens[idx].attrPush( ['class', 'ui image'])
    return defaultImageRenderer( tokens, idx, options, env, self)
}

const defaultLinkOpenRender = md.renderer.rules.link_open || function(tokens, idx, options, env, self) {
    return self.renderToken(tokens, idx, options);
};
  
md.renderer.rules.link_open = function (tokens, idx, options, env, self) {
    const aIndex = tokens[idx].attrIndex('href');
    const href = tokens[idx].attrs[aIndex][1]

    if( !href.startsWith('/') && !href.startsWith('https://www.pirogram.com')) {
        tokens[idx].attrPush(['target', '_blank'])
    }

    return defaultLinkOpenRender(tokens, idx, options, env, self);
};

md.renderer.rules.table_open = function( tokens, idx, options, env, self) {
    tokens[idx].attrPush(['class', 'ui celled striped table'])
    return self.renderToken( tokens, idx, options)
}

export function markdownToHtml( s) {
    return md.render( s)
}