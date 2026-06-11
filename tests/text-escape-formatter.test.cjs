const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const page = fs.readFileSync(path.resolve(__dirname, '../text_escape_formatter_final.html'), 'utf8');
const nav = fs.readFileSync(path.resolve(__dirname, '../nav.js'), 'utf8');

assert.match(nav, /path: 'text_escape_formatter_final\.html'/);
assert.match(page, /<title>文本转义转换工具<\/title>/);
assert.match(page, /<link rel="stylesheet" href="nav\.css">/);
assert.match(page, /<script src="nav\.js" defer><\/script>/);
assert.match(page, /<div class="container">/);
assert.match(page, /<div class="tool-title">/);
assert.match(page, /class="version-info" onclick="showChangelog\(\)"/);
assert.match(page, /<div class="changelog-version">V1\.00<\/div>/);

assert.match(page, /id="decodeBtn"/);
assert.match(page, /id="encodeBtn"/);
assert.match(page, /id="mergeStringsBtn"/);
assert.match(page, /function decodeToReadableText\(raw\)/);
assert.match(page, /function encodeToEscapedString\(raw\)/);
assert.match(page, /function mergeConcatenatedStrings\(raw\)/);
assert.match(page, /function showChangelog\(\)/);
assert.match(page, /function closeChangelog\(\)/);
assert.match(page, /window\.showChangelog = showChangelog/);
assert.match(page, /window\.closeChangelog = closeChangelog/);

const elements = new Map();
function element(id) {
    if (!elements.has(id)) {
        elements.set(id, {
            id,
            value: '',
            textContent: '',
            className: '',
            style: {},
            addEventListener() {},
            focus() {},
            select() {},
        });
    }
    return elements.get(id);
}

const context = {
    console,
    navigator: {},
    window: {
        clearTimeout() {},
        setTimeout() {},
        addEventListener() {},
        isSecureContext: false,
    },
    document: {
        getElementById: element,
        addEventListener() {},
        createElement() {
            return {
                value: '',
                style: {},
                focus() {},
                select() {},
            };
        },
        body: {
            appendChild() {},
            removeChild() {},
        },
        execCommand() {
            return true;
        },
    },
};

const scripts = [...page.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g)].map((match) => match[1]);
for (const script of scripts) {
    vm.runInNewContext(script, context);
}

const jdbcSnippet = `"(jdbc:mysql://[^,\\\\s]+|jdbc:postgresql://[^,\\\\s]+|jdbc:tdsql-mysql://[^,\\\\s]+|jdbc:postgresql://[^,\\\\s]+"
                    + "|jdbc:gaussdb://[^,\\\\s]+|jdbc:opengauss://[^,\\\\s]+|jdbc:olap://[^,\\\\s]+|jdbc:oracle:(thin|oci):@[^,\\\\s]*"
                    + "|jdbc:sqlserver://[^,\\\\s]+)"`;

assert.strictEqual(
    context.mergeConcatenatedStrings(jdbcSnippet),
    '(jdbc:mysql://[^,\\s]+|jdbc:postgresql://[^,\\s]+|jdbc:tdsql-mysql://[^,\\s]+|jdbc:postgresql://[^,\\s]+|jdbc:gaussdb://[^,\\s]+|jdbc:opengauss://[^,\\s]+|jdbc:olap://[^,\\s]+|jdbc:oracle:(thin|oci):@[^,\\s]*|jdbc:sqlserver://[^,\\s]+)'
);

assert.strictEqual(
    context.mergeConcatenatedStrings('"jdbc:" + dbType + "://host"'),
    'jdbc:\n+ dbType +\n://host'
);

console.log('text escape formatter integration passed');
