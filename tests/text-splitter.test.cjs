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
assert.strictEqual(splitter.estimateTokens('hello world'), 4);
assert.strictEqual(splitter.estimateTokens('你好世界'), 4);
assert.strictEqual(splitter.estimateTokens('hello 世界'), 4);
assert.deepStrictEqual(
    splitter.splitTextByEstimatedTokens('hello world again', 4),
    ['hello world ', 'again']
);
assert.deepStrictEqual(
    splitter.splitTextStrictly('abcdefghijk', 5),
    ['abcde', 'fghij', 'k']
);
assert.deepStrictEqual(
    splitter.splitTextByStrategy('alpha line\nbeta line\ngamma', 22, 'lines'),
    ['alpha line\nbeta line\n', 'gamma']
);
assert.deepStrictEqual(
    splitter.splitTextByStrategy('first sentence. second sentence! third sentence?', 34, 'sentences'),
    ['first sentence. second sentence! ', 'third sentence?']
);
assert.deepStrictEqual(
    splitter.splitTextByStrategy('第一句内容。第二句内容！第三句内容？', 12, 'sentences'),
    ['第一句内容。第二句内容！', '第三句内容？']
);
assert.deepStrictEqual(
    splitter.splitTextByStrategy('const value = veryLongVariableName;\nreturn value;', 16, 'lines'),
    ['const value = ', 'veryLongVariable', 'Name;\n', 'return value;']
);
assert.deepStrictEqual(
    splitter.splitTextByEstimatedTokensWithStrategy('alpha beta\ngamma delta', 4, 'lines'),
    ['alpha beta\n', 'gamma delta']
);
assert.deepStrictEqual(
    splitter.applySegmentTemplates(['alpha', 'beta'], { prefix: '第 {index}/{total} 段：', suffix: '\n---' }),
    ['第 1/2 段：alpha\n---', '第 2/2 段：beta\n---']
);
assert.deepStrictEqual(
    splitter.getCopySegments(['alpha', 'beta'], { includeTemplateInCopy: false, prefix: '第 {index}/{total} 段：' }),
    ['alpha', 'beta']
);
assert.deepStrictEqual(
    splitter.getCopySegments(['alpha', 'beta'], { includeTemplateInCopy: true, prefix: '第 {index}/{total} 段：' }),
    ['第 1/2 段：alpha', '第 2/2 段：beta']
);

const source = 'Line one.\nLine two is longer.\n\nFinal paragraph.';
const segments = splitter.splitText(source, 18);
assert.strictEqual(segments.join(''), source);
assert.ok(segments.every((segment) => segment.length <= 18));

assert.throws(() => splitter.splitText('text', 0), /positive integer/);
assert.throws(() => splitter.splitText('text', 2.5), /positive integer/);
assert.deepStrictEqual(
    splitter.getClipboardHistoryWriteOrder(['第一段', '第二段', '第三段']),
    ['第三段', '第二段', '第一段']
);
assert.deepStrictEqual(splitter.getClipboardHistoryWriteOrder([]), []);

const page = fs.readFileSync(path.resolve(__dirname, '../text-splitter.html'), 'utf8');
const nav = fs.readFileSync(path.resolve(__dirname, '../nav.js'), 'utf8');
const home = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
const readme = fs.readFileSync(path.resolve(__dirname, '../README.md'), 'utf8');
const development = fs.readFileSync(path.resolve(__dirname, '../DEVELOPMENT.md'), 'utf8');

assert.match(page, /<title>文本智能拆分<\/title>/);
assert.match(page, /<link rel="stylesheet" href="nav\.css">/);
assert.match(page, /<script src="nav\.js" defer><\/script>/);
assert.match(page, /<script src="editor-lines\.js"><\/script>/);
assert.match(page, /<script src="text-splitter\.js"><\/script>/);
assert.match(page, /id="maxLength"[^>]*value="2950"/);
assert.match(page, /id="splitMode"/);
assert.match(page, /<option value="characters">字符长度<\/option>/);
assert.match(page, /<option value="tokens">Token 估算<\/option>/);
assert.match(page, /id="inputText"/);
assert.match(page, /id="inputLineNumbers"/);
assert.match(page, /id="splitBtn"/);
assert.match(page, /id="copyAllBtn"/);
assert.match(page, /id="copyHistoryBtn"/);
assert.match(page, /id="resultList"/);
assert.match(page, /class="editor-shell"/);
assert.match(page, /class="segment-editor"/);
assert.match(page, /class="segment-line-numbers"/);
assert.match(page, /function buildLineNumbers\(text\)/);
assert.match(page, /function refreshInputLineNumbers\(\)/);
assert.match(page, /inputLineNumbers\.scrollTop = inputText\.scrollTop/);
assert.match(page, /\.editor-shell\s*\{[^}]*height:\s*570px;/s);
assert.match(page, /textarea\s*\{[^}]*height:\s*100%;/s);
assert.doesNotMatch(page, /max-height:\s*calc\(100vh - 230px\)/);
assert.match(page, /\.result-list\s*\{[^}]*overflow:\s*visible;/s);
assert.match(page, /\.segment-editor\s*\{[^}]*height:\s*calc\(6 \* 1\.6em \+ 24px\);/s);
assert.match(page, /\.segment-content\s*\{[^}]*overflow:\s*auto;/s);
assert.match(page, /class="btn btn-small fullscreen-segment-btn"/);
assert.match(page, /id="segment-preview-modal"/);
assert.match(page, /id="segmentPreviewContent"/);
assert.match(page, /function showSegmentPreview\(index\)/);
assert.match(page, /function closeSegmentPreview\(\)/);
assert.match(page, /segmentLineNumbers\.scrollTop = segmentContent\.scrollTop/);
assert.match(page, /const scrollPosition = \{ x: window\.scrollX, y: window\.scrollY \};/);
assert.match(page, /window\.scrollTo\(scrollPosition\.x, scrollPosition\.y\)/);
assert.match(page, /async function copySegmentsToHistory\(\)/);
assert.match(page, /TextSplitter\.getClipboardHistoryWriteOrder\(copySegments\)/);
assert.match(page, /await delay\(600\)/);
assert.match(page, /copyHistoryBtn\.addEventListener\('click', copySegmentsToHistory\)/);
assert.match(page, /V1\.06/);
assert.match(page, /Token 估算拆分/);
assert.match(page, /id="splitStrategy"/);
assert.match(page, /<option value="lines">/);
assert.match(page, /<option value="paragraphs">/);
assert.match(page, /<option value="sentences">/);
assert.match(page, /<option value="characters">/);
assert.match(page, /id="prefixTemplate"/);
assert.match(page, /id="suffixTemplate"/);
assert.match(page, /id="includeTemplateInCopy"/);
assert.match(page, /TextSplitter\.applySegmentTemplates\(segments, getTemplateOptions\(\)\)/);
assert.match(page, /TextSplitter\.getCopySegments\(currentSegments, getTemplateOptions\(\)\)/);
assert.match(page, /第 \{index\}\/\{total\} 段：/);
assert.match(page, /TextSplitter\.splitTextByEstimatedTokensWithStrategy\(inputText\.value, limit, strategy\)/);
assert.match(page, /TextSplitter\.splitTextByStrategy\(inputText\.value, limit, strategy\)/);
assert.match(page, /TextSplitter\.estimateTokens\(segment\)/);
assert.match(page, /字符，约/);
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
