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
assert.match(page, /id="swap-btn"/);
assert.match(page, /<span>V1\.00<\/span>/);
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
