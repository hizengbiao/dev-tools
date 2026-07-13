const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const rootDir = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(rootDir, 'editor-lines.js'), 'utf8');
const context = {
    window: {},
    module: { exports: {} },
};
context.globalThis = context;
vm.runInNewContext(source, context);

const EditorLines = context.module.exports;

assert.equal(EditorLines.buildLineNumbers(''), '1');
assert.equal(EditorLines.buildLineNumbers('one'), '1');
assert.equal(EditorLines.buildLineNumbers('one\ntwo\nthree'), '1\n2\n3');
assert.equal(EditorLines.buildLineNumbers('one\n'), '1\n2');

const textarea = { value: 'a\nb', scrollTop: 32 };
const lineNumbers = { textContent: '', scrollTop: 0 };
EditorLines.refreshLineNumbers(textarea, lineNumbers);
assert.equal(lineNumbers.textContent, '1\n2');
assert.equal(lineNumbers.scrollTop, 32);

textarea.scrollTop = 64;
EditorLines.syncLineNumberScroll(textarea, lineNumbers);
assert.equal(lineNumbers.scrollTop, 64);

for (const file of ['url-encoder.html', 'text_escape_formatter_final.html', 'regex-tester.html', 'text-splitter.html', 'html-formatter.html']) {
    const html = fs.readFileSync(path.join(rootDir, file), 'utf8');
    assert.match(html, /<script src="editor-lines\.js"><\/script>/, `${file} should include editor-lines.js`);
}

console.log('editor lines utilities passed');
