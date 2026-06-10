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
assert.match(page, /<span>V1\.02<\/span>/);
assert.match(page, /<h3>🚀 版本更新说明<\/h3>/);
assert.match(page, /<div class="changelog-version">V1\.02<\/div>/);
assert.match(page, /<div class="changelog-desc">优化正则测试布局、测试内容行号、匹配结果行列定位和替换文本示例说明。<\/div>/);
assert.match(page, /<div class="changelog-version">V1\.01<\/div>/);
assert.match(page, /<div class="changelog-version">V1\.00<\/div>/);

assert.match(page, /class="workspace three-column"/);
assert.match(page, /class="panel input-panel"/);
assert.match(page, /class="panel control-panel"/);
assert.match(page, /class="panel output-panel"/);
assert.match(page, /class="editor-with-lines"/);
assert.match(page, /id="testLineNumbers"/);
assert.match(page, /id="testText"/);
assert.match(page, /id="patternInput"/);
assert.match(page, /value="\^\(1\[3-9\]\\d\{2\}\)\\d\{3\}\(\\d\{4\}\)\$"/);
assert.match(page, /id="replaceInput"/);
assert.match(page, /value="\$1\*\*\*\$2"/);
assert.match(page, /placeholder="例如：手机号脱敏 \$1\*\*\*\$2"/);
assert.match(page, /title="替换文本示例：&#10;\$1、\$2 表示匹配规则里的第 1、第 2 个括号分组。&#10;当前默认规则会把手机号拆成前 4 位和后 4 位，默认替换文本会输出脱敏手机号。&#10;\$& 表示完整匹配内容，例如把每个手机号替换为【\$&】。&#10;删除匹配内容：替换文本留空即可。"/);
assert.match(page, /id="replaceHint"/);
assert.match(page, /<p class="field-help">[\s\S]*?替换文本是“找到匹配内容后要换成什么”。[\s\S]*?默认示例会把手机号中间 3 位替换成星号[\s\S]*?<code>\$1\*\*\*\$2<\/code>[\s\S]*?<\/p>/);

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
assert.doesNotMatch(page, /当前标志/);
assert.match(page, /id="testBtn"[^>]*>测试匹配<\/button>/);
assert.match(page, /id="replaceBtn"[^>]*>执行替换<\/button>/);
assert.match(page, /id="copyMatchBtn"[^>]*>复制匹配结果<\/button>/);
assert.match(page, /id="copyReplaceBtn"[^>]*>复制替换结果<\/button>/);
assert.doesNotMatch(page, /id="loadSampleBtn"/);
assert.doesNotMatch(page, /载入手机号示例/);

assert.match(page, /function updateLineNumbers\(\)/);
assert.match(page, /function syncLineNumberScroll\(\)/);
assert.match(page, /function getLineColumn\(text, index\)/);
assert.match(page, /function buildRegex\(\)/);
assert.match(page, /function runMatch\(\)/);
assert.match(page, /function runReplace\(\)/);
assert.match(page, /function getCaptureGroupCount\(/);
assert.match(page, /function getMissingReplacementGroups\(/);
assert.match(page, /function updateReplaceHint\(/);
assert.match(page, /function renderHighlightedText\(/);
assert.match(page, /起始位置: \$\{match\.index\}（第 \$\{position\.line\} 行第 \$\{position\.column\} 列）/);
assert.match(page, /testText\.addEventListener\('input', \(\) => \{/);
assert.match(page, /testText\.addEventListener\('scroll', syncLineNumberScroll\)/);

assert.match(page, /<strong>正则表达式测试工具说明：<\/strong>/);
assert.match(page, /用于在多行文本中快速验证正则表达式、预览匹配高亮、查看每条匹配的索引与行列位置，并按替换文本生成替换结果。/);
assert.doesNotMatch(page, /常用标志/);
assert.match(page, /function showChangelog\(\)/);
assert.match(page, /window\.showChangelog = showChangelog/);

console.log('regex tester integration passed');
