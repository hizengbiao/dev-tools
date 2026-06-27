const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const page = fs.readFileSync(path.resolve(__dirname, '../url-encoder.html'), 'utf8');

assert.match(page, /id="swapBtn"/);
assert.match(page, /onclick="swapInputOutput\(\)"/);
assert.match(page, /class="converter-workspace"/);
assert.match(page, /class="editor-shell"/);
assert.match(page, /<script src="editor-lines\.js"><\/script>/);
assert.match(page, /id="inputHighlight"/);
assert.match(page, /id="outputHighlight"/);
assert.match(page, /id="inputLineNumbers"/);
assert.match(page, /id="outputLineNumbers"/);
assert.match(page, /class="workspace-actions"/);
assert.doesNotMatch(page, /id="diffPanel"/);
assert.doesNotMatch(page, /text-decoration:\s*line-through/);
assert.match(page, /function buildDiffSegments\(original, result\)/);
assert.match(page, /function renderDiff\(\)/);
assert.match(page, /function syncHighlightScroll\(textarea, highlight, lineNumbers\)/);
assert.match(page, /function updateLineNumbers\(textarea, lineNumbers\)/);
assert.match(page, /<span>V1\.03<\/span>/);
assert.match(page, /<div class="changelog-date">2026年6月26日<\/div>[\s\S]*?<div class="changelog-version">V1\.03<\/div>/);
assert.match(page, /id="urlAnalysisPanel"/);
assert.match(page, /id="urlAnalysisStatus"/);
assert.match(page, /id="urlFieldProtocol"/);
assert.match(page, /id="urlFieldHostname"/);
assert.match(page, /id="urlFieldPort"/);
assert.match(page, /id="urlFieldPathname"/);
assert.match(page, /id="urlFieldHash"/);
assert.match(page, /id="queryParamTable"/);
assert.match(page, /function parseUrlInfo\(raw\)/);
assert.match(page, /function renderUrlAnalysis\(\)/);

const elements = new Map();
function createElement(id = '') {
    return {
        id,
        value: '',
        textContent: '',
        hidden: false,
        className: '',
        style: {},
        scrollTop: 0,
        scrollLeft: 0,
        children: [],
        classList: {
            add() {},
            remove() {},
        },
        appendChild(child) {
            this.children.push(child);
            return child;
        },
        replaceChildren(...children) {
            this.children = children;
        },
        addEventListener() {},
        focus() {},
    };
}

function element(id) {
    if (!elements.has(id)) {
        elements.set(id, createElement(id));
    }
    return elements.get(id);
}

const context = {
    console,
    URL,
    EditorLines: {
        buildLineNumbers(text) {
            return String(text || '').split('\n').map((_, index) => index + 1).join('\n');
        },
        refreshLineNumbers(textarea, lineNumbers) {
            lineNumbers.textContent = this.buildLineNumbers(textarea.value);
            this.syncLineNumberScroll(textarea, lineNumbers);
        },
        syncLineNumberScroll(textarea, lineNumbers) {
            lineNumbers.scrollTop = textarea.scrollTop;
        },
    },
    navigator: {
        clipboard: {
            writeText() {
                return Promise.resolve();
            },
        },
    },
    window: {
        addEventListener() {},
    },
    document: {
        getElementById: element,
        createElement(tagName) {
            return createElement(tagName);
        },
    },
    setTimeout() {},
};

const scripts = [...page.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g)]
    .map((match) => match[1]);

for (const script of scripts) {
    vm.runInNewContext(script, context);
}

function plainSegments(segments) {
    return JSON.parse(JSON.stringify(segments));
}

assert.deepStrictEqual(
    plainSegments(context.buildDiffSegments('abc', 'abc')),
    [{ type: 'equal', text: 'abc' }]
);

assert.deepStrictEqual(
    plainSegments(context.buildDiffSegments('ab', 'aXb')),
    [
        { type: 'equal', text: 'a' },
        { type: 'insert', text: 'X' },
        { type: 'equal', text: 'b' },
    ]
);

assert.deepStrictEqual(
    plainSegments(context.buildDiffSegments('aXb', 'ab')),
    [
        { type: 'equal', text: 'a' },
        { type: 'delete', text: 'X' },
        { type: 'equal', text: 'b' },
    ]
);

assert.deepStrictEqual(
    plainSegments(context.buildDiffSegments('cat', 'cut')),
    [
        { type: 'equal', text: 'c' },
        { type: 'delete', text: 'a' },
        { type: 'insert', text: 'u' },
        { type: 'equal', text: 't' },
    ]
);

const parsedUrl = context.parseUrlInfo('https://example.com:8443/api/users?name=%E5%BC%A0%E4%B8%89&empty=&flag#top');
assert.strictEqual(parsedUrl.ok, true);
assert.strictEqual(parsedUrl.protocol, 'https:');
assert.strictEqual(parsedUrl.hostname, 'example.com');
assert.strictEqual(parsedUrl.port, '8443');
assert.strictEqual(parsedUrl.pathname, '/api/users');
assert.strictEqual(parsedUrl.hash, '#top');
assert.deepStrictEqual(JSON.parse(JSON.stringify(parsedUrl.queryParams)), [
    { key: 'name', value: '%E5%BC%A0%E4%B8%89', decodedKey: 'name', decodedValue: '张三' },
    { key: 'empty', value: '', decodedKey: 'empty', decodedValue: '' },
    { key: 'flag', value: '', decodedKey: 'flag', decodedValue: '' },
]);

const parsedRelativeUrl = context.parseUrlInfo('/api/users?page=1');
assert.strictEqual(parsedRelativeUrl.ok, true);
assert.strictEqual(parsedRelativeUrl.isRelative, true);
assert.strictEqual(parsedRelativeUrl.pathname, '/api/users');
assert.strictEqual(parsedRelativeUrl.queryParams[0].decodedValue, '1');

const invalidUrl = context.parseUrlInfo('not a url with spaces');
assert.strictEqual(invalidUrl.ok, false);

elements.get('input-text').value = 'left';
elements.get('output-text').value = 'right';
context.swapInputOutput();
assert.strictEqual(elements.get('input-text').value, 'right');
assert.strictEqual(elements.get('output-text').value, 'left');
assert.strictEqual(elements.get('inputHighlight').children.length > 0, true);
assert.strictEqual(elements.get('outputHighlight').children.length > 0, true);

context.clearAll();
assert.strictEqual(elements.get('input-text').value, '');
assert.strictEqual(elements.get('output-text').value, '');
assert.strictEqual(elements.get('inputHighlight').children.length, 0);
assert.strictEqual(elements.get('outputHighlight').children.length, 0);

elements.get('input-text').value = 'not processed yet';
context.renderDiff();
assert.strictEqual(elements.get('inputHighlight').children.length, 0);
assert.strictEqual(elements.get('outputHighlight').children.length, 0);
assert.strictEqual(elements.get('diffSummary').textContent, '');

elements.get('input-text').value = 'first\nsecond\nthird';
context.updateLineNumbers(elements.get('input-text'), elements.get('inputLineNumbers'));
assert.strictEqual(elements.get('inputLineNumbers').textContent, '1\n2\n3');

elements.get('input-text').scrollTop = 44;
elements.get('input-text').scrollLeft = 18;
context.syncHighlightScroll(
    elements.get('input-text'),
    elements.get('inputHighlight'),
    elements.get('inputLineNumbers')
);
assert.strictEqual(elements.get('inputHighlight').scrollTop, 44);
assert.strictEqual(elements.get('inputHighlight').scrollLeft, 18);
assert.strictEqual(elements.get('inputLineNumbers').scrollTop, 44);

console.log('url encoder diff behavior passed');
