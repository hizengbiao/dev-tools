const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const pagePath = path.resolve(__dirname, '../json-parser.html');
const page = fs.readFileSync(pagePath, 'utf8');
const script = [...page.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g)]
    .map((match) => match[1])
    .join('\n');

assert.match(page, /<span>V1\.82<\/span>/);
assert.match(page, /<div class="changelog-version">V1\.82<\/div>/);
assert.match(page, /<div class="changelog-date">2026年6月30日<\/div>[\s\S]*?<div class="changelog-version">V1\.82<\/div>/);
assert.match(page, /<div class="changelog-version">V1\.81<\/div>/);
assert.match(page, /<div class="changelog-date">2026年6月25日<\/div>[\s\S]*?<div class="changelog-version">V1\.81<\/div>/);
assert.match(page, /<div class="changelog-date">2026年6月11日<\/div>/);
assert.match(page, /<div class="changelog-version">V1\.80<\/div>/);
assert.match(page, /<script src="json-repair-guards\.js"><\/script>/);
assert.match(page, /<script src="json-path-query\.js"><\/script>/);
assert.match(page, /JsonRepairGuards\.shouldSkipJsonRepair\(raw\)/);
assert.doesNotMatch(page, /function shouldSkipJsonRepair\(raw\)/);

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
        ClipboardUtils: {
            showToast() {},
            copyText: async () => true,
        },
        JsonRepairGuards: require(path.resolve(__dirname, '../json-repair-guards.js')),
        JsonPathQuery: require(path.resolve(__dirname, '../json-path-query.js')),
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

const truncatedNestedArray = `[
    [
        {
            "id": 0,
            "srcType": "ServiceUnit",
            "data": "{\\"attributes\\":{\\"database_name\\":\\"db-0.cn_30100,db-1.cn_30100,db-2.cn_30100/db\\"},\\"aggregation\\":{\\"latest\\":\\"2.0\\",\\"latest_time\\":\\"2026-06-23 23:59:37\\"}}",
            "disconnected": false`;

const secondHarness = createHarness();
secondHarness.elements.get('json-input').value = truncatedNestedArray;
secondHarness.context.fixJson();

assert.equal(secondHarness.elements.get('error-msg').style.display, 'none');
const repaired = JSON.parse(secondHarness.elements.get('json-input').value);
assert.equal(repaired[0][0].id, 0);
assert.equal(repaired[0][0].srcType, 'ServiceUnit');
assert.equal(repaired[0][0].disconnected, false);
assert.equal(
    JSON.parse(repaired[0][0].data).attributes.database_name,
    'db-0.cn_30100,db-1.cn_30100,db-2.cn_30100/db'
);

const queryHarness = createHarness();
queryHarness.elements.get('json-input').value = '{"data":[{"name":"alpha"},{"name":"beta"}]}';
queryHarness.elements.get('json-path-input').value = '$.data[1].name';
queryHarness.context.handleJsonPathQuery();
assert.equal(queryHarness.elements.get('json-path-result').textContent, 'beta');

console.log('json parser repair guards passed');
