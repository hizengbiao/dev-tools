const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const rootDir = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(rootDir, 'clipboard-utils.js'), 'utf8');

function loadClipboardUtils(overrides = {}) {
    const context = {
        window: {},
        module: { exports: {} },
        ...overrides,
    };
    context.globalThis = context;
    vm.runInNewContext(source, context);
    return { context, ClipboardUtils: context.module.exports };
}

{
    const toast = { textContent: '', className: '' };
    const { ClipboardUtils } = loadClipboardUtils({
        document: {
            getElementById(id) {
                return id === 'toast' ? toast : null;
            },
        },
        clearTimeout() {},
        setTimeout(callback) {
            callback();
            return 1;
        },
    });

    ClipboardUtils.showToast('已复制', { duration: 1 });
    assert.equal(toast.textContent, '已复制');
    assert.equal(toast.className, '');

    ClipboardUtils.showToast('失败', { isError: true, duration: 0 });
    assert.equal(toast.textContent, '失败');
    assert.equal(toast.className, 'show error');
}

{
    let copied = '';
    const { ClipboardUtils } = loadClipboardUtils({
        navigator: {
            clipboard: {
                writeText(value) {
                    copied = value;
                    return Promise.resolve();
                },
            },
        },
        document: { getElementById() { return null; } },
    });

    ClipboardUtils.writeClipboardText('hello').then((ok) => {
        assert.equal(ok, true);
        assert.equal(copied, 'hello');
    });
}

{
    const textarea = {
        value: '',
        style: {},
        focus() {},
        select() {},
        setAttribute() {},
    };
    let appended = false;
    let removed = false;
    const { ClipboardUtils } = loadClipboardUtils({
        navigator: {},
        document: {
            createElement(tagName) {
                assert.equal(tagName, 'textarea');
                return textarea;
            },
            execCommand(command) {
                assert.equal(command.toLowerCase(), 'copy');
                return true;
            },
            body: {
                appendChild(node) {
                    appended = node === textarea;
                },
                removeChild(node) {
                    removed = node === textarea;
                },
            },
            getElementById() { return null; },
        },
    });

    ClipboardUtils.writeClipboardText('fallback').then((ok) => {
        assert.equal(ok, true);
        assert.equal(textarea.value, 'fallback');
        assert.equal(appended, true);
        assert.equal(removed, true);
    });
}

for (const file of [
    'base64-encoder.html',
    'html-formatter.html',
    'json-parser.html',
    'regex-tester.html',
    'text-case-converter.html',
    'text-splitter.html',
    'text_escape_formatter_final.html',
    'timestamp-converter.html',
    'url-encoder.html',
]) {
    const html = fs.readFileSync(path.join(rootDir, file), 'utf8');
    assert.match(html, /<script src="clipboard-utils\.js"><\/script>/, `${file} should include clipboard-utils.js`);
}

console.log('clipboard utilities passed');
