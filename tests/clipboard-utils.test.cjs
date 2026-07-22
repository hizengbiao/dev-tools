const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const rootDir = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(rootDir, 'clipboard-utils.js'), 'utf8');
const navCss = fs.readFileSync(path.join(rootDir, 'nav.css'), 'utf8');

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

const pasteTargets = [
    ['text-case-converter.html', 'input-text', 'constantFormatBtn', '粘贴并转换'],
    ['regex-tester.html', 'testText', 'testBtn', '粘贴并测试'],
    ['regex-tester.html', 'patternInput', 'testBtn', '粘贴并测试'],
    ['text_escape_formatter_final.html', 'inputText', 'encodeBtn', '粘贴并转换'],
    ['text-splitter.html', 'inputText', 'splitBtn', '粘贴并拆分'],
    ['sql-formatter.html', 'sql-input', 'format-btn', '粘贴并格式化'],
    ['url-encoder.html', 'input-text', 'encodeBtn', '粘贴并编码'],
    ['base64-encoder.html', 'input-text', 'textEncodeBtn', '粘贴并编码'],
    ['hash-generator.html', 'text-input', 'hash-text-btn', '粘贴并计算'],
    ['jwt-decoder.html', 'jwt-input', 'decode-btn', '粘贴并解析'],
];

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

for (const [file, targetId, actionId, label] of pasteTargets) {
    const html = fs.readFileSync(path.join(rootDir, file), 'utf8');
    assert.match(
        html,
        new RegExp(`data-clipboard-paste-target="${targetId}"`),
        `${file} should provide a clipboard paste button for ${targetId}`
    );
    assert.match(
        html,
        new RegExp(`data-clipboard-paste-target="${targetId}"[^>]*data-clipboard-paste-action="${actionId}"`),
        `${file} should trigger ${actionId} after pasting into ${targetId}`
    );
    assert.match(html, new RegExp(`>[^<]*${label}<\/button>`), `${file} should label the paste action as ${label}`);
}
assert.match(navCss, /\[data-clipboard-paste-target\]\s*\{[^}]*white-space:\s*nowrap;/s);

async function testPasteText() {
    let inputEventCount = 0;
    let focused = false;
    let selection = [];
    const target = {
        value: '',
        dispatchEvent(event) {
            assert.equal(event.type, 'input');
            inputEventCount += 1;
        },
        focus() { focused = true; },
        setSelectionRange(start, end) { selection = [start, end]; },
    };
    function FakeEvent(type) { this.type = type; }
    const { ClipboardUtils } = loadClipboardUtils({
        navigator: { clipboard: { readText: async () => 'clipboard value' } },
        document: {
            getElementById(id) { return id === 'target-input' ? target : null; },
        },
        Event: FakeEvent,
    });

    const ok = await ClipboardUtils.pasteText('target-input');
    assert.equal(ok, true);
    assert.equal(target.value, 'clipboard value');
    assert.equal(inputEventCount, 1);
    assert.equal(focused, true);
    assert.deepEqual(selection, [15, 15]);

    const unsupported = await ClipboardUtils.readClipboardText({ navigatorRef: {} });
    assert.equal(unsupported.ok, false);

    const previousValue = target.value;
    const emptyOk = await ClipboardUtils.pasteText(target, {
        navigatorRef: { clipboard: { readText: async () => '' } },
    });
    assert.equal(emptyOk, false);
    assert.equal(target.value, previousValue);

    const deniedOk = await ClipboardUtils.pasteText(target, {
        navigatorRef: { clipboard: { readText: async () => { throw new Error('denied'); } } },
    });
    assert.equal(deniedOk, false);
    assert.equal(target.value, previousValue);

    let actionClickCount = 0;
    const action = { click() { actionClickCount += 1; } };
    const actionButton = {
        dataset: {
            clipboardPasteTarget: 'target-input',
            clipboardPasteAction: 'primary-action',
        },
    };
    const actionOk = await ClipboardUtils.pasteFromButton(actionButton, {
        navigatorRef: { clipboard: { readText: async () => 'run action' } },
        documentRef: {
            getElementById(id) {
                if (id === 'target-input') return target;
                if (id === 'primary-action') return action;
                return null;
            },
        },
    });
    assert.equal(actionOk, true);
    assert.equal(target.value, 'run action');
    assert.equal(actionClickCount, 1);
}

testPasteText()
    .then(() => console.log('clipboard utilities passed'))
    .catch(error => {
        console.error(error);
        process.exitCode = 1;
    });
