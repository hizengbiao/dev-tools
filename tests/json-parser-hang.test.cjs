const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const pagePath = path.resolve(__dirname, '../json-parser.html');
const page = fs.readFileSync(pagePath, 'utf8');
const script = [...page.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g)]
    .map((match) => match[1])
    .join('\n');

assert.match(page, /<span>V1\.87<\/span>/);
assert.match(page, /<div class="changelog-version">V1\.87<\/div>/);
assert.match(page, /<div class="changelog-version">V1\.86<\/div>/);
assert.match(page, /<div class="changelog-version">V1\.85<\/div>/);
assert.match(page, /<div class="changelog-version">V1\.84<\/div>/);
assert.match(page, /<div class="changelog-version">V1\.83<\/div>/);
assert.match(page, /<div class="changelog-version">V1\.82<\/div>/);
assert.match(page, /2026[\s\S]*?7[\s\S]*?1[\s\S]*?<div class="changelog-version">V1\.87<\/div>/);
assert.match(page, /<div class="changelog-version">V1\.81<\/div>/);
assert.match(page, /<div class="changelog-date">2026年6月25日<\/div>[\s\S]*?<div class="changelog-version">V1\.81<\/div>/);
assert.match(page, /<div class="changelog-date">2026年6月11日<\/div>/);
assert.match(page, /<div class="changelog-version">V1\.80<\/div>/);
assert.match(page, /<script src="json-repair-guards\.js"><\/script>/);
assert.match(page, /<script src="json-path-query\.js"><\/script>/);
assert.match(page, /<script src="json-key-paths\.js"><\/script>/);
assert.match(page, /<script src="json-search-results\.js"><\/script>/);
assert.match(page, /<script src="json-string-fields\.js"><\/script>/);
assert.doesNotMatch(page, /<button[^>]+onclick="expandJsonStringFields\(\)"/);
assert.doesNotMatch(page, /<button[^>]+onclick="restoreJsonStringFields\(\)"/);
assert.match(page, /function expandJsonStringFieldAtPath\(path\)/);
assert.match(page, /function restoreJsonStringFieldAtPath\(path\)/);
assert.match(page, /JsonStringFields\.expandStringifiedJsonFieldAtPath\(currentObj, path\)/);
assert.match(page, /JsonStringFields\.restoreStringifiedJsonFieldAtPath\(currentObj, path\)/);
assert.match(page, /id="json-search-input"/);
assert.match(page, /id="json-search-results"/);
assert.match(page, /function handleJsonSearch\(\)/);
assert.match(page, /JsonSearchResults\.searchJsonTree\(target, jsonSearchInput\.value/);
assert.match(page, /id="json-key-paths-result"/);
assert.match(page, /function handleExtractJsonKeyPaths\(\)/);
assert.match(page, /JsonKeyPaths\.extractJsonKeyPaths\(target\)/);
assert.match(page, /function copyJsonKeyPaths\(\)/);
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
            child.parentElement = this;
            this.children.push(child);
            return child;
        },
        remove() {},
        querySelectorAll() { return []; },
        querySelector() { return null; },
        setAttribute() {},
    };
}

function collectElements(root, predicate, results = []) {
    if (predicate(root)) {
        results.push(root);
    }

    for (const child of root.children || []) {
        collectElements(child, predicate, results);
    }

    return results;
}

function createHarness() {
    const elements = new Map();
    let copiedText = '';
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
            copyText: async (text) => {
                copiedText = text;
                return true;
            },
        },
        JsonRepairGuards: require(path.resolve(__dirname, '../json-repair-guards.js')),
        JsonPathQuery: require(path.resolve(__dirname, '../json-path-query.js')),
        JsonKeyPaths: require(path.resolve(__dirname, '../json-key-paths.js')),
        JsonSearchResults: require(path.resolve(__dirname, '../json-search-results.js')),
        JsonStringFields: require(path.resolve(__dirname, '../json-string-fields.js')),
        console,
        setTimeout,
        clearTimeout,
        prompt: () => null,
    };
    context.window = context;

    vm.runInNewContext(script, context, { timeout: 1000 });
    return { context, elements, getCopiedText: () => copiedText };
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

const keyPathsHarness = createHarness();
keyPathsHarness.elements.get('json-input').value = '{"items":[{"id":1},{"name":"beta"}],"tags":["a"]}';
keyPathsHarness.context.handleExtractJsonKeyPaths();
assert.equal(keyPathsHarness.elements.get('json-key-paths-result').value, 'items\nitems[].id\nitems[].name\ntags\ntags[]');
assert.match(keyPathsHarness.elements.get('json-key-paths-count').textContent, /5/);

const searchHarness = createHarness();
searchHarness.elements.get('json-input').value = '{"items":[{"id":1,"name":"alpha"},{"id":2,"name":"beta"}]}';
searchHarness.elements.get('json-search-input').value = 'beta';
searchHarness.context.handleJsonSearch();
assert.match(searchHarness.elements.get('json-search-summary').textContent, /1/);
assert.match(searchHarness.elements.get('json-search-results').innerHTML, /items\[1\]\.name/);
assert.match(searchHarness.elements.get('json-search-results').innerHTML, /beta/);

const stringFieldHarness = createHarness();
stringFieldHarness.elements.get('json-input').value = '{"payload":"{\\"name\\":\\"alpha\\"}","plain":"x"}';
stringFieldHarness.context.handleFormat();
const inlineExpandButtons = collectElements(
    stringFieldHarness.elements.get('json-output'),
    (element) => element.title === '展开这个 JSON 字符串字段'
);
assert.equal(inlineExpandButtons.length, 1);
inlineExpandButtons[0].onclick({ stopPropagation() {} });
assert.deepStrictEqual(JSON.parse(stringFieldHarness.elements.get('json-input').value), {
    payload: { name: 'alpha' },
    plain: 'x',
});
const inlineRestoreButtons = collectElements(
    stringFieldHarness.elements.get('json-output'),
    (element) => element.title === '恢复这个 JSON 字符串字段'
);
assert.equal(inlineRestoreButtons.length, 1);
inlineRestoreButtons[0].onclick({ stopPropagation() {} });
assert.deepStrictEqual(JSON.parse(stringFieldHarness.elements.get('json-input').value), {
    payload: '{"name":"alpha"}',
    plain: 'x',
});

const tooltipPathHarness = createHarness();
tooltipPathHarness.elements.get('json-input').value = '{"items":[{"key":"host","a.b":1}]}';
tooltipPathHarness.context.handleFormat();
const keySpans = collectElements(
    tooltipPathHarness.elements.get('json-output'),
    (element) => element.className === 'key'
);
const targetKey = keySpans.find((element) => element.textContent === '"key"');
assert.ok(targetKey, 'tree should render the object key');
targetKey.onmouseenter({ clientX: 0, clientY: 0 });
const copyPathButton = collectElements(
    tooltipPathHarness.elements.get('path-tooltip'),
    (element) => element.className === 'path-copy-btn'
)[0];
assert.ok(copyPathButton, 'tooltip should render a full path copy button');
copyPathButton.onclick({ stopPropagation() {} });
assert.equal(tooltipPathHarness.getCopiedText(), '$.items[0].key');

console.log('json parser repair guards passed');
