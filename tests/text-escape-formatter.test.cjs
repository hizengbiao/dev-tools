const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const page = fs.readFileSync(path.resolve(__dirname, '../text_escape_formatter_final.html'), 'utf8');
const nav = fs.readFileSync(path.resolve(__dirname, '../nav.js'), 'utf8');

assert.match(nav, /name: '文本转义'/);
assert.match(nav, /path: 'text_escape_formatter_final\.html'/);

assert.match(page, /<title>文本转义转换工具<\/title>/);
assert.match(page, /<link rel="stylesheet" href="nav\.css">/);
assert.match(page, /<script src="nav\.js" defer><\/script>/);
assert.match(page, /<div class="container">/);
assert.match(page, /<div class="tool-title">/);
assert.match(page, /<h1>文本转义转换<\/h1>/);
assert.match(page, /class="version-info" onclick="showChangelog\(\)"/);
assert.match(page, /<span>V1\.00<\/span>/);
assert.match(page, /<h3>🚀 版本更新说明<\/h3>/);
assert.match(page, /<div class="changelog-version">V1\.00<\/div>/);
assert.match(page, /<div class="changelog-desc">版本初始化<\/div>/);

assert.match(page, /id="decodeBtn"[^>]*>转为可读文本<\/button>/);
assert.match(page, /id="encodeBtn"[^>]*>转为转义字符串<\/button>/);
assert.match(page, /function decodeToReadableText\(raw\)/);
assert.match(page, /function encodeToEscapedString\(raw\)/);
assert.match(page, /function showChangelog\(\)/);
assert.match(page, /function closeChangelog\(\)/);
assert.match(page, /window\.showChangelog = showChangelog/);
assert.match(page, /window\.closeChangelog = closeChangelog/);

console.log('text escape formatter integration passed');
