const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const page = fs.readFileSync(path.resolve(__dirname, '../url-encoder.html'), 'utf8');

assert.match(page, /id="swapBtn"/);
assert.match(page, /onclick="swapInputOutput\(\)"/);
assert.match(page, /class="converter-workspace"/);
assert.match(page, /class="editor-shell"/);
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
assert.match(page, /<span>V1\.02<\/span>/);
assert.match(page, /<div class="changelog-version">V1\.02<\/div>/);

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
