const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const pagePath = path.resolve(__dirname, '../regex-tester.html');
const page = fs.existsSync(pagePath) ? fs.readFileSync(pagePath, 'utf8') : '';
const nav = fs.readFileSync(path.resolve(__dirname, '../nav.js'), 'utf8');
const index = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');

assert.match(nav, /name: '正则测试'/);
assert.match(nav, /path: 'regex-tester\.html'/);
assert.match(index, /href="regex-tester\.html"/);
assert.match(index, /正则表达式测试/);

assert.match(page, /<title>正则表达式测试工具<\/title>/);
assert.match(page, /<link rel="stylesheet" href="nav\.css">/);
assert.match(page, /<script src="nav\.js" defer><\/script>/);
assert.match(page, /<h1>正则表达式测试<\/h1>/);
assert.match(page, /class="version-info" onclick="showChangelog\(\)"/);
assert.match(page, /<span>V1\.00<\/span>/);
assert.match(page, /<h3>🚀 版本更新说明<\/h3>/);
assert.match(page, /<div class="changelog-desc">版本初始化<\/div>/);

assert.match(page, /id="testText"/);
assert.match(page, /id="patternInput"/);
assert.match(page, /id="replaceInput"/);
assert.match(page, /id="matchResult"/);
assert.match(page, /id="replaceResult"/);
assert.match(page, /id="flagGlobal"/);
assert.match(page, /id="flagIgnoreCase"/);
assert.match(page, /id="flagMultiline"/);
assert.match(page, /id="flagDotAll"/);
assert.match(page, /id="flagUnicode"/);
assert.match(page, /id="testBtn"[^>]*>测试匹配<\/button>/);
assert.match(page, /id="replaceBtn"[^>]*>执行替换<\/button>/);
assert.match(page, /id="copyMatchBtn"[^>]*>复制匹配结果<\/button>/);
assert.match(page, /id="copyReplaceBtn"[^>]*>复制替换结果<\/button>/);

assert.match(page, /function buildRegex\(\)/);
assert.match(page, /function runMatch\(\)/);
assert.match(page, /function runReplace\(\)/);
assert.match(page, /function renderHighlightedText\(/);
assert.match(page, /function showChangelog\(\)/);
assert.match(page, /window\.showChangelog = showChangelog/);

console.log('regex tester integration passed');
