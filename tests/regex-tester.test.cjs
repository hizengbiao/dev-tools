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
assert.match(page, /<span>V1\.01<\/span>/);
assert.match(page, /<h3>🚀 版本更新说明<\/h3>/);
assert.match(page, /<div class="changelog-version">V1\.01<\/div>/);
assert.match(page, /<div class="changelog-desc">优化正则标志按钮文案，增加鼠标右上方悬停说明，并移除右侧标志展示。<\/div>/);
assert.match(page, /<div class="changelog-version">V1\.00<\/div>/);
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
assert.match(page, /data-tooltip="勾选后会找出文本里的全部匹配结果，而不是只找第一个。"/);
assert.match(page, /data-tooltip="勾选后匹配时不区分英文字母大小写。"/);
assert.match(page, /data-tooltip="勾选后可以按每一行单独匹配，适合逐行校验手机号、日志等内容。"/);
assert.match(page, /data-tooltip="勾选后点号可以匹配换行符。"/);
assert.match(page, /data-tooltip="勾选后会按 Unicode 规则识别字符，适合包含中文、表情或特殊字符的文本。"/);
assert.match(page, /<label class="flag-pill" data-tooltip="[^"]+"><input id="flagGlobal" type="checkbox" checked> 查找全部<\/label>/);
assert.match(page, /<label class="flag-pill" data-tooltip="[^"]+"><input id="flagIgnoreCase" type="checkbox"> 忽略大小写<\/label>/);
assert.match(page, /<label class="flag-pill" data-tooltip="[^"]+"><input id="flagMultiline" type="checkbox" checked> 逐行匹配<\/label>/);
assert.match(page, /<label class="flag-pill" data-tooltip="[^"]+"><input id="flagDotAll" type="checkbox"> 点号匹配换行<\/label>/);
assert.match(page, /<label class="flag-pill" data-tooltip="[^"]+"><input id="flagUnicode" type="checkbox"> 识别 Unicode<\/label>/);
assert.doesNotMatch(page, /<label class="flag-pill" title=/);
assert.match(page, /id="flagTooltip"/);
assert.match(page, /function moveFlagTooltip\(/);
assert.match(page, /const gapX = 16;/);
assert.match(page, /const gapY = 14;/);
assert.match(page, /event\.clientX \+ gapX/);
assert.match(page, /event\.clientY - flagTooltip\.offsetHeight - gapY/);
assert.doesNotMatch(page, /id="flagSummary"/);
assert.doesNotMatch(page, /当前标志/);
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
