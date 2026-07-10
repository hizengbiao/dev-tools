const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const rootDir = path.resolve(__dirname, '..');
const page = fs.readFileSync(path.join(rootDir, 'base64-encoder.html'), 'utf8');

assert.match(page, /<span>V1\.02<\/span>/);
assert.match(page, /<div class="changelog-date">2026年7月10日<\/div>[\s\S]*?<div class="changelog-version">V1\.02<\/div>[\s\S]*?<div class="changelog-version">V1\.01<\/div>/);
assert.match(page, /id="base64-recommendation"/);
assert.match(page, /function detectBase64Intent\(raw\)/);
assert.match(page, /function updateBase64Recommendation\(\)/);
assert.match(page, /function convertBase64ToBase64Url\(raw\)/);
assert.match(page, /function normalizeBase64UrlToBase64\(raw\)/);
assert.match(page, /function getDecodedBase64UrlText\(raw\)/);
assert.match(page, /function doBase64UrlEncode\(\)/);
assert.match(page, /function doBase64UrlDecode\(\)/);

const scriptMatch = page.match(/<script>\s*([\s\S]*?)\s*<\/script>\s*<\/body>/);
assert.ok(scriptMatch, 'inline script should be present');

function createElement(id = '') {
    return {
        id,
        value: '',
        textContent: '',
        className: '',
        style: {},
        classList: {
            add() {},
            remove() {}
        },
        focus() {},
        select() {},
        addEventListener() {}
    };
}

const elements = new Map();
function element(id) {
    if (!elements.has(id)) {
        elements.set(id, createElement(id));
    }
    return elements.get(id);
}

const context = {
    window: {
        atob(value) {
            return Buffer.from(value, 'base64').toString('binary');
        }
    },
    document: {
        getElementById: element,
        querySelectorAll() {
            return [];
        }
    },
    ClipboardUtils: {
        copyText() {},
        showToast() {}
    },
    FileReader: function FileReader() {},
    btoa(value) {
        return Buffer.from(value, 'binary').toString('base64');
    },
    unescape,
    encodeURIComponent,
    decodeURIComponent,
    escape,
    console
};
context.window.document = context.document;
context.window.btoa = context.btoa;

vm.createContext(context);
vm.runInContext(scriptMatch[1], context);

function plain(value) {
    return JSON.parse(JSON.stringify(value));
}

assert.deepStrictEqual(
    plain(context.detectBase64Intent('eyJhIjoxfQ==')),
    {
        type: 'decode',
        label: '建议解码',
        reason: '内容符合 Base64 特征，解码后像可读文本'
    }
);

assert.deepStrictEqual(
    plain(context.detectBase64Intent('SGVsbG8sIOS4lueVjA==')),
    {
        type: 'decode',
        label: '建议解码',
        reason: '内容符合 Base64 特征，解码后像可读文本'
    }
);

assert.deepStrictEqual(
    plain(context.detectBase64Intent('hello world')),
    {
        type: 'encode',
        label: '建议编码',
        reason: '内容更像普通文本'
    }
);

assert.deepStrictEqual(
    plain(context.detectBase64Intent('')),
    {
        type: 'neutral',
        label: '等待输入',
        reason: '输入内容后会自动判断更适合编码还是解码'
    }
);

element('input-text').value = 'eyJhIjoxfQ==';
context.updateBase64Recommendation();
assert.equal(element('base64-recommendation').textContent, '建议解码：内容符合 Base64 特征，解码后像可读文本');
assert.match(element('base64-recommendation').className, /recommend-decode/);

element('input-text').value = 'hello world';
context.updateBase64Recommendation();
assert.equal(element('base64-recommendation').textContent, '建议编码：内容更像普通文本');
assert.match(element('base64-recommendation').className, /recommend-encode/);

assert.equal(context.convertBase64ToBase64Url('SGVsbG8+/w=='), 'SGVsbG8-_w');
assert.equal(context.normalizeBase64UrlToBase64('SGVsbG8-_w'), 'SGVsbG8+/w==');
assert.equal(context.getDecodedBase64UrlText('5L2g5aW9'), '你好');

element('input-text').value = 'SGVsbG8+/w==';
context.doBase64UrlEncode();
assert.equal(element('output-text').value, 'SGVsbG8-_w');

element('input-text').value = '5L2g5aW9';
context.doBase64UrlDecode();
assert.equal(element('output-text').value, '你好');

console.log('base64 encoder recommendation behavior passed');
