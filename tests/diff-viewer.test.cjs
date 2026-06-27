const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const rootDir = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(rootDir, 'diff-viewer.js'), 'utf8');
const context = {
    window: {},
    module: { exports: {} },
};
context.globalThis = context;
vm.runInNewContext(source, context);

const DiffViewer = context.module.exports;

function plainSegments(segments) {
    return JSON.parse(JSON.stringify(segments));
}

assert.deepEqual(
    plainSegments(DiffViewer.buildDiffSegments('abc', 'abc')),
    [{ type: 'equal', text: 'abc' }]
);
assert.deepEqual(
    plainSegments(DiffViewer.buildDiffSegments('ab', 'aXb')),
    [
        { type: 'equal', text: 'a' },
        { type: 'insert', text: 'X' },
        { type: 'equal', text: 'b' },
    ]
);
assert.deepEqual(
    plainSegments(DiffViewer.buildDiffSegments('aXb', 'ab')),
    [
        { type: 'equal', text: 'a' },
        { type: 'delete', text: 'X' },
        { type: 'equal', text: 'b' },
    ]
);
assert.deepEqual(
    plainSegments(DiffViewer.buildDiffSegments('cat', 'cut')),
    [
        { type: 'equal', text: 'c' },
        { type: 'delete', text: 'a' },
        { type: 'insert', text: 'u' },
        { type: 'equal', text: 't' },
    ]
);

const largeDiff = plainSegments(DiffViewer.buildDiffSegments('a'.repeat(1100), 'b'.repeat(1100)));
assert.deepEqual(
    largeDiff.map((segment) => ({ type: segment.type, length: segment.text.length })),
    [
        { type: 'delete', length: 1100 },
        { type: 'insert', length: 1100 },
    ]
);

const nodes = [];
const documentStub = {
    createElement(tagName) {
        const node = { tagName, textContent: '', className: '' };
        nodes.push(node);
        return node;
    },
};
const node = DiffViewer.createDiffNode(documentStub, 'changed', 'diff-insert');
assert.equal(node.tagName, 'span');
assert.equal(node.textContent, 'changed');
assert.equal(node.className, 'diff-insert');

for (const file of ['url-encoder.html', 'text_escape_formatter_final.html']) {
    const html = fs.readFileSync(path.join(rootDir, file), 'utf8');
    assert.match(html, /<script src="diff-viewer\.js"><\/script>/, `${file} should include diff-viewer.js`);
    assert.match(html, /DiffViewer\.buildDiffSegments/, `${file} should use DiffViewer.buildDiffSegments`);
    assert.match(html, /DiffViewer\.createDiffNode/, `${file} should use DiffViewer.createDiffNode`);
}

console.log('diff viewer utilities passed');
