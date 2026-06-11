const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const pagePath = path.resolve(__dirname, '../json-parser.html');
const page = fs.readFileSync(pagePath, 'utf8');
const script = [...page.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g)]
    .map((match) => match[1])
    .join('\n');

assert.match(page, /<span>V1\.80<\/span>/);
assert.match(page, /<div class="changelog-date">2026年6月11日<\/div>/);
assert.match(page, /<div class="changelog-version">V1\.80<\/div>/);
assert.match(page, /function shouldSkipJsonRepair\(raw\)/);
assert.match(page, /function looksLikeCodeStringConcatenation\(raw\)/);
assert.match(page, /function looksLikeRegexSnippet\(raw\)/);

function createElementStub(id = '') {
    return {
        id,
        value: '',
        textContent: '',
        innerHTML: '',
        style: {},
        dataset: {},
        disabled: false,
        className: '',
        children: [],
        classList: {
            add() {},
            remove() {},
            contains() { return false; },
        },
        addEventListener() {},
        appendChild(child) {
            this.children.push(child);
            return child;
        },
        remove() {},
        querySelectorAll() { return []; },
        querySelector() { return null; },
        setAttribute() {},
    };
}

function createHarness() {
    const elements = new Map();
    const document = {
        getElementById(id) {
            if (!elements.has(id)) {
                elements.set(id, createElementStub(id));
            }
            return elements.get(id);
        },
        createElement(tagName) {
            const element = createElementStub();
            element.tagName = tagName.toUpperCase();
            return element;
        },
        createTextNode(text) {
            return { textContent: text };
        },
        querySelectorAll() { return []; },
        addEventListener() {},
        body: createElementStub('body'),
    };

    const context = {
        document,
        window: {},
        navigator: { clipboard: { readText: async () => '', writeText: async () => {} } },
        console,
        setTimeout,
        clearTimeout,
        prompt: () => null,
    };
    context.window = context;

    vm.runInNewContext(script, context, { timeout: 1000 });
    return { context, elements };
}

const nonJsonRegexSnippet = String.raw`"(jdbc:mysql://[^,\\s]+|jdbc:postgresql://[^,\\s]+|jdbc:tdsql-mysql://[^,\\s]+|jdbc:postgresql://[^,\\s]+" 
                    + "|jdbc:gaussdb://[^,\\s]+|jdbc:opengauss://[^,\\s]+|jdbc:olap://[^,\\s]+|jdbc:oracle:(thin|oci):@[^,\\s]*"
                    + "|jdbc:sqlserver://[^,\\s]+)"`;

const { context, elements } = createHarness();
elements.get('json-input').value = nonJsonRegexSnippet;

const started = Date.now();
context.handleFormat();
const elapsedMs = Date.now() - started;

assert.ok(elapsedMs < 200, `non-JSON regex snippet should fail fast, took ${elapsedMs}ms`);
assert.equal(elements.get('json-output').innerHTML, '');
assert.equal(elements.get('error-msg').style.display, 'block');
assert.match(elements.get('error-msg').textContent, /JSON|修复|格式/);

console.log('json parser non-json guard passed');
