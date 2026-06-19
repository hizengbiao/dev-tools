const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const splitter = require(path.resolve(__dirname, '../text-splitter.js'));

assert.deepStrictEqual(splitter.splitText('', 10), []);
assert.deepStrictEqual(splitter.splitText('short text', 10), ['short text']);
assert.deepStrictEqual(
    splitter.splitText('Homemade Sauce Collection', 10),
    ['Homemade ', 'Sauce ', 'Collection']
);
assert.deepStrictEqual(
    splitter.splitText('第一句内容。第二句内容，第三句内容。', 7),
    ['第一句内容。', '第二句内容，', '第三句内容。']
);
assert.deepStrictEqual(
    splitter.splitText('abcdefghijk', 5),
    ['abcde', 'fghij', 'k']
);
assert.deepStrictEqual(
    splitter.splitText('alpha beta gamma delta', 11),
    ['alpha beta ', 'gamma delta']
);
assert.deepStrictEqual(
    splitter.splitText('你好🙂世界', 3),
    ['你好🙂', '世界']
);

const source = 'Line one.\nLine two is longer.\n\nFinal paragraph.';
const segments = splitter.splitText(source, 18);
assert.strictEqual(segments.join(''), source);
assert.ok(segments.every((segment) => segment.length <= 18));

assert.throws(() => splitter.splitText('text', 0), /positive integer/);
assert.throws(() => splitter.splitText('text', 2.5), /positive integer/);

const page = fs.readFileSync(path.resolve(__dirname, '../text-splitter.html'), 'utf8');
const nav = fs.readFileSync(path.resolve(__dirname, '../nav.js'), 'utf8');
const home = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
const readme = fs.readFileSync(path.resolve(__dirname, '../README.md'), 'utf8');
const development = fs.readFileSync(path.resolve(__dirname, '../DEVELOPMENT.md'), 'utf8');

assert.match(page, /<title>文本智能拆分<\/title>/);
assert.match(page, /<link rel="stylesheet" href="nav\.css">/);
assert.match(page, /<script src="nav\.js" defer><\/script>/);
assert.match(page, /<script src="text-splitter\.js"><\/script>/);
assert.match(page, /id="maxLength"[^>]*value="2950"/);
assert.match(page, /id="inputText"/);
assert.match(page, /id="splitBtn"/);
assert.match(page, /id="copyAllBtn"/);
assert.match(page, /id="resultList"/);
assert.match(page, /class="version-info" onclick="showChangelog\(\)"/);
assert.match(page, /🚀 版本更新说明/);
assert.match(page, /V1\.00/);
for (const match of page.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g)) {
    new vm.Script(match[1]);
}
assert.match(nav, /name: '文本拆分', path: 'text-splitter\.html'/);
assert.match(home, /href="text-splitter\.html"/);
assert.match(readme, /text-splitter\.html/);
assert.match(development, /text-splitter\.html/);

console.log('text splitter behavior and integration passed');
