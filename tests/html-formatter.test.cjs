const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const formatter = require(path.join(root, 'html-formatter.js'));

assert.strictEqual(
    formatter.formatHtml('<div><span class="name">Hello</span><br><img src="avatar.png"></div>'),
    [
        '<div>',
        '  <span class="name">Hello</span>',
        '  <br>',
        '  <img src="avatar.png">',
        '</div>',
    ].join('\n')
);

assert.strictEqual(
    formatter.formatHtml('<section><div>内容</div></section>', { indentSize: 4 }),
    '<section>\n    <div>内容</div>\n</section>'
);

assert.strictEqual(
    formatter.formatHtml('<p>Hello <strong>world</strong>!</p>'),
    '<p>Hello <strong>world</strong>!</p>',
    'mixed inline content should not gain whitespace before punctuation'
);

assert.strictEqual(
    formatter.formatHtml('<script>\nif (a < b) {\n  run();\n}\n</script>'),
    '<script>\n  if (a < b) {\n    run();\n  }\n</script>'
);

assert.strictEqual(
    formatter.compressHtml('<div>\n  <span>Hello</span>\n  <br>\n</div>'),
    '<div><span>Hello</span><br></div>'
);

assert.strictEqual(
    formatter.repairHtml('<div><span>内容</div>'),
    '<div>\n  <span>内容</span>\n</div>'
);
assert.strictEqual(
    formatter.repairHtml('</aside><main><p>内容'),
    '<main>\n  <p>内容</p>\n</main>'
);

const tree = formatter.buildHtmlTree('<main><section><h2>标题</h2><br></section></main>');
assert.strictEqual(tree.children[0].name, 'main');
assert.strictEqual(tree.children[0].children[0].name, 'section');
assert.strictEqual(tree.children[0].children[0].children[0].name, 'h2');
assert.strictEqual(tree.children[0].children[0].children[0].children[0].type, 'text');
assert.strictEqual(tree.children[0].children[0].children[0].children[0].value, '标题');
assert.strictEqual(tree.children[0].children[0].children[1].selfClosing, true);
assert.strictEqual(tree.children[0].start, 0);
assert.strictEqual(tree.children[0].end, '<main><section><h2>标题</h2><br></section></main>'.length);

assert.strictEqual(
    formatter.replaceHtmlBlock(
        '<main><section><p>旧内容</p></section><footer>页脚</footer></main>',
        [0, 0],
        '<section class="updated"><h2>新内容</h2></section>'
    ),
    '<main><section class="updated"><h2>新内容</h2></section><footer>页脚</footer></main>'
);
assert.strictEqual(formatter.replaceHtmlBlock('<main></main>', [9], '<aside></aside>'), '<main></main>');

const pairedTags = '<main><section><span>内容</span></section></main>';
assert.deepStrictEqual(
    formatter.findMatchingTagAroundCursor(pairedTags, pairedTags.indexOf('<section>') + 2),
    {
        start: pairedTags.indexOf('</section>'),
        end: pairedTags.indexOf('</section>') + '</section>'.length,
        value: '</section>',
        name: 'section',
        closing: true,
    }
);
assert.deepStrictEqual(
    formatter.findMatchingTagAroundCursor(pairedTags, pairedTags.indexOf('</span>') + 3),
    {
        start: pairedTags.indexOf('<span>'),
        end: pairedTags.indexOf('<span>') + '<span>'.length,
        value: '<span>',
        name: 'span',
        closing: false,
    }
);
assert.strictEqual(formatter.findMatchingTagAroundCursor('<main><br></main>', 8), null);

assert.deepStrictEqual(formatter.analyzeHtml('<main><div><span>内容</span></div></main>'), {
    elementCount: 3,
    maxDepth: 3,
    issues: [],
});
assert.match(formatter.analyzeHtml('<div><span></div>').issues.join('\n'), /span/);

const page = fs.readFileSync(path.join(root, 'html-formatter.html'), 'utf8');
assert.match(page, /<title>HTML 元素格式化工具<\/title>/);
assert.match(page, /<script src="html-formatter\.js"><\/script>/);
assert.match(page, /<script src="editor-lines\.js"><\/script>/);
assert.match(page, /<script src="clipboard-utils\.js"><\/script>/);
assert.match(page, /id="html-input"/);
assert.match(page, /id="html-output"/);
assert.match(page, /id="format-btn"/);
assert.match(page, /id="compress-btn"/);
assert.match(page, /id="repair-btn"/);
assert.match(page, /id="paste-format-btn"/);
assert.match(page, /id="edit-btn"/);
assert.match(page, /id="undo-btn"/);
assert.match(page, /id="redo-btn"/);
assert.doesNotMatch(page, /id="indent-size"/);
assert.doesNotMatch(page, /class="indent-control"/);
assert.match(page, /const HTML_INDENT_SIZE = 2;/);
assert.match(page, /id="preview-btn"/);
assert.match(page, /id="preview-tab"/);
assert.match(page, /id="preview-view"/);
assert.match(page, /id="html-preview"[^>]*sandbox="allow-same-origin"[^>]*referrerpolicy="no-referrer"/);
assert.match(page, /function renderPreview\(\)/);
assert.match(page, /function showPreview\(\)/);
assert.match(page, /function sanitizePreviewHtml\(rawContent\)/);
assert.match(page, /querySelectorAll\('script, meta\[http-equiv="refresh" i\]'\)/);
assert.match(page, /previewFrame\.srcdoc = content/);
assert.doesNotMatch(page, /id="swap-btn"/);
assert.match(page, /id="html-tree-output"/);
assert.match(page, /id="expand-all-btn"/);
assert.match(page, /id="collapse-all-btn"/);
assert.match(page, /HtmlFormatter\.buildHtmlTree/);
assert.match(page, /HtmlFormatter\.findMatchingTagAroundCursor/);
assert.match(page, /function setupTagMatching\(textarea\)/);
assert.match(page, /function beginBlockEdit\(wrapper, node, path\)/);
assert.match(page, /function saveBlockEdit\(path, replacement\)/);
assert.match(page, /className = 'tree-edit-btn'/);
assert.match(page, /HtmlFormatter\.replaceHtmlBlock\(output\.value, path, replacement\)/);
assert.match(page, /className = 'tag-highlight-overlay'/);
assert.match(page, /\.html-tree-node:hover\s*\{/);
assert.match(page, /\.tree-children\s*\{[^}]*padding:\s*2px 0 2px 10px;[^}]*margin-left:\s*2px;/s);
assert.match(page, /\.html-tree\s*\{[^}]*font:\s*13px\/1\.6/s);
assert.match(page, /textarea\s*\{[^}]*padding:\s*15px;[^}]*font:\s*13px\/1\.5/s);
assert.doesNotMatch(page, /\.depth-1\s*\{/);
assert.match(page, /<span>V1\.06<\/span>/);
assert.match(page, /<div class="changelog-date">2026年7月14日<\/div>[\s\S]*?<div class="changelog-version">V1\.06<\/div>[\s\S]*?<div class="changelog-version">V1\.05<\/div>[\s\S]*?<div class="changelog-version">V1\.04<\/div>[\s\S]*?<div class="changelog-version">V1\.03<\/div>[\s\S]*?<div class="changelog-version">V1\.02<\/div>[\s\S]*?<div class="changelog-version">V1\.01<\/div>/);
assert.match(page, /<div class="changelog-date">2026年7月13日<\/div>[\s\S]*?<div class="changelog-version">V1\.00<\/div>/);

const nav = fs.readFileSync(path.join(root, 'nav.js'), 'utf8');
const home = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
const development = fs.readFileSync(path.join(root, 'DEVELOPMENT.md'), 'utf8');
assert.match(nav, /name: 'HTML 格式化', path: 'html-formatter\.html'/);
assert.doesNotMatch(nav, /tool-config-manager\.html/);
assert.match(home, /href="html-formatter\.html"/);
assert.doesNotMatch(home, /href="tool-config-manager\.html"/);
assert.match(readme, /html-formatter\.html/);
assert.doesNotMatch(readme, /tool-config-manager\.html/);
assert.match(development, /html-formatter\.html/);
assert.doesNotMatch(development, /tool-config-manager\.html/);

console.log('html formatter behavior passed');
