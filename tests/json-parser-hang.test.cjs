const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const pagePath = path.resolve(__dirname, '../json-parser.html');
const page = fs.readFileSync(pagePath, 'utf8');
const script = [...page.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g)]
    .map((match) => match[1])
    .join('\n');

assert.match(page, /<span>V1\.93<\/span>/);
assert.match(page, /<div class="changelog-date">2026年7月23日<\/div>[\s\S]*?<div class="changelog-version">V1\.93<\/div>/);
assert.match(page, /<div class="changelog-date">2026年7月15日<\/div>[\s\S]*?<div class="changelog-version">V1\.92<\/div>/);
assert.match(page, /<div class="changelog-date">2026年7月13日<\/div>[\s\S]*?<div class="changelog-version">V1\.91<\/div>/);
assert.match(page, /<div class="changelog-date">2026年7月4日<\/div>[\s\S]*?<div class="changelog-version">V1\.90<\/div>/);
assert.match(page, /<div class="changelog-version">V1\.90<\/div>/);
assert.match(page, /<div class="changelog-version">V1\.89<\/div>/);
assert.match(page, /<div class="changelog-version">V1\.88<\/div>/);
assert.match(page, /<div class="changelog-version">V1\.87<\/div>/);
assert.match(page, /<div class="changelog-version">V1\.86<\/div>/);
assert.match(page, /<div class="changelog-version">V1\.85<\/div>/);
assert.match(page, /<div class="changelog-version">V1\.84<\/div>/);
assert.match(page, /<div class="changelog-version">V1\.83<\/div>/);
assert.match(page, /<div class="changelog-version">V1\.82<\/div>/);
assert.match(page, /2026[\s\S]*?7[\s\S]*?1[\s\S]*?<div class="changelog-version">V1\.88<\/div>/);
assert.match(page, /<div class="changelog-version">V1\.81<\/div>/);
assert.match(page, /<div class="changelog-date">2026年6月25日<\/div>[\s\S]*?<div class="changelog-version">V1\.81<\/div>/);
assert.match(page, /<div class="changelog-date">2026年6月11日<\/div>/);
assert.match(page, /<div class="changelog-version">V1\.80<\/div>/);
assert.match(page, /<script src="json-repair-guards\.js"><\/script>/);
assert.match(page, /<script src="json-assignment-extractor\.js"><\/script>/);
assert.match(page, /<script src="json-repair-normalizer\.js"><\/script>/);
assert.match(page, /<script src="json-java-style-normalizer\.js"><\/script>/);
assert.match(page, /!JsonJavaStyleNormalizer\.looksLikeJavaStyleObject\(raw\)/);
assert.match(page, /<script src="json-path-query\.js"><\/script>/);
assert.doesNotMatch(page, /<script src="json-key-paths\.js"><\/script>/);
assert.doesNotMatch(page, /<script src="json-search-results\.js"><\/script>/);
assert.match(page, /<script src="json-string-fields\.js"><\/script>/);
assert.doesNotMatch(page, /<button[^>]+onclick="expandJsonStringFields\(\)"/);
assert.doesNotMatch(page, /<button[^>]+onclick="restoreJsonStringFields\(\)"/);
assert.match(page, /function expandJsonStringFieldAtPath\(path\)/);
assert.match(page, /function restoreJsonStringFieldAtPath\(path\)/);
assert.match(page, /JsonStringFields\.expandStringifiedJsonFieldAtPath\(currentObj, path\)/);
assert.match(page, /JsonStringFields\.restoreStringifiedJsonFieldAtPath\(currentObj, path\)/);
assert.doesNotMatch(page, /id="json-path-input"/);
assert.doesNotMatch(page, /id="json-path-result"/);
assert.doesNotMatch(page, /function handleJsonPathQuery\(\)/);
assert.doesNotMatch(page, /JsonPathQuery\.queryJsonPath\(target, pathInput\.value\)/);
assert.doesNotMatch(page, /id="json-search-input"/);
assert.doesNotMatch(page, /id="json-search-results"/);
assert.doesNotMatch(page, /function handleJsonSearch\(\)/);
assert.doesNotMatch(page, /JsonSearchResults\.searchJsonTree\(target, jsonSearchInput\.value/);
assert.doesNotMatch(page, /id="json-key-paths-result"/);
assert.doesNotMatch(page, /function handleExtractJsonKeyPaths\(\)/);
assert.doesNotMatch(page, /JsonKeyPaths\.extractJsonKeyPaths\(target\)/);
assert.doesNotMatch(page, /function copyJsonKeyPaths\(\)/);
assert.match(page, /JsonRepairGuards\.shouldSkipJsonRepair\(raw\)/);
assert.match(page, /JsonAssignmentExtractor\.extractJsonValueFromAssignmentLog\(raw\)/);
assert.match(page, /JsonRepairNormalizer\.stripCommentsOutsideStrings\(raw\)/);
assert.match(page, /JsonRepairNormalizer\.fixChineseColons\(raw\)/);
assert.match(page, /JsonRepairNormalizer\.addMissingCommas\(raw\)/);
assert.match(page, /JsonRepairNormalizer\.addQuotesToUnquotedStrings\(raw\)/);
assert.match(page, /JsonJavaStyleNormalizer\.normalizeJavaStyleObject\(raw\)/);
assert.doesNotMatch(page, /function shouldSkipJsonRepair\(raw\)/);
assert.doesNotMatch(page, /function extractJsonValueFromAssignmentLog\(raw\)/);
assert.doesNotMatch(page, /function stripCommentsOutsideStrings\(raw\)/);
assert.doesNotMatch(page, /function fixChineseColons\(raw\)/);
assert.doesNotMatch(page, /function addMissingCommas\(raw\)/);
assert.doesNotMatch(page, /function addQuotesToUnquotedStrings\(raw\)/);
assert.doesNotMatch(page, /function normalizeJavaStyleObject\(raw\)/);

function createElementStub(id = '') {
    const element = {
        id,
        value: '',
        textContent: '',
        innerHTML: '',
        style: {},
        dataset: {},
        disabled: false,
        className: '',
        children: [],
        scrollIntoViewCallCount: 0,
        classList: {
            add(className) {
                if (!this.owner.className.split(/\s+/).includes(className)) {
                    this.owner.className = `${this.owner.className} ${className}`.trim();
                }
            },
            remove(className) {
                this.owner.className = this.owner.className
                    .split(/\s+/)
                    .filter((item) => item && item !== className)
                    .join(' ');
            },
            contains(className) {
                return this.owner.className.split(/\s+/).includes(className);
            },
        },
        addEventListener() {},
        appendChild(child) {
            child.parentElement = this;
            this.children.push(child);
            return child;
        },
        remove() {},
        querySelectorAll(selector) {
            if (selector === '.json-node') {
                return collectElements(this, (element) => element.className.split(/\s+/).includes('json-node'));
            }
            return [];
        },
        querySelector(selector) {
            if (selector === '.json-row') {
                return collectElements(this, (element) => element.className.split(/\s+/).includes('json-row'))[0] || null;
            }
            return null;
        },
        setAttribute() {},
        scrollIntoView() {
            this.scrollIntoViewCallCount += 1;
        },
    };
    element.classList.owner = element;
    return element;
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
        querySelectorAll(selector) {
            if (selector === '.json-node') {
                return Array.from(elements.values()).flatMap((element) => element.querySelectorAll(selector));
            }
            return [];
        },
        addEventListener() {},
        body: createElementStub('body'),
    };
    document.body.classList.owner = document.body;

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
        JsonAssignmentExtractor: require(path.resolve(__dirname, '../json-assignment-extractor.js')),
        JsonRepairNormalizer: require(path.resolve(__dirname, '../json-repair-normalizer.js')),
        JsonJavaStyleNormalizer: require(path.resolve(__dirname, '../json-java-style-normalizer.js')),
        JsonPathQuery: require(path.resolve(__dirname, '../json-path-query.js')),
        JsonStringFields: require(path.resolve(__dirname, '../json-string-fields.js')),
        console,
        setTimeout: (fn) => {
            fn();
            return 0;
        },
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

const bracketPrefixedParamsLog = '[b3d7e0c5433eda2b3460][FeignRequest][DaFeignService][docail]params={"cluster":"tc-jht03","productId":"L03","appName":"cta","artifactId":"cmata","serviceUuid":"L.03@cata_UAT_UAT"}';

const bracketPrefixHarness = createHarness();
bracketPrefixHarness.elements.get('json-input').value = bracketPrefixedParamsLog;
bracketPrefixHarness.context.fixJson();

assert.equal(bracketPrefixHarness.elements.get('error-msg').style.display, 'none');
assert.deepStrictEqual(JSON.parse(bracketPrefixHarness.elements.get('json-input').value), {
    cluster: 'tc-jht03',
    productId: 'L03',
    appName: 'cta',
    artifactId: 'cmata',
    serviceUuid: 'L.03@cata_UAT_UAT',
});

const descriptivePrefixHarness = createHarness();
descriptivePrefixHarness.elements.get('json-input').value = '消费到云见各决策子系统异常信号：{"objectType":"K8sWorker","objectId":"node-01","impactRangeObjectIdList":[]}';
descriptivePrefixHarness.context.fixJson();

assert.equal(descriptivePrefixHarness.elements.get('error-msg').style.display, 'none');
assert.deepStrictEqual(JSON.parse(descriptivePrefixHarness.elements.get('json-input').value), {
    objectType: 'K8sWorker',
    objectId: 'node-01',
    impactRangeObjectIdList: [],
});

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
const pathSegments = collectElements(
    tooltipPathHarness.elements.get('path-tooltip'),
    (element) => element.className === 'path-segment'
);
assert.deepEqual(
    pathSegments.map((element) => element.textContent),
    ['$', 'items', '[0]', 'key']
);
const rootNode = collectElements(
    tooltipPathHarness.elements.get('json-output'),
    (element) => element.className.split(/\s+/).includes('json-node') && element.dataset.path === '[]'
)[0];
assert.ok(rootNode, 'tree should render a root node with empty path');
pathSegments[0].onclick({ stopPropagation() {} });
assert.equal(rootNode.scrollIntoViewCallCount, 1, 'clicking $ should locate the JSON root node');
const copyPathButton = collectElements(
    tooltipPathHarness.elements.get('path-tooltip'),
    (element) => element.className === 'path-copy-btn'
)[0];
assert.ok(copyPathButton, 'tooltip should render a full path copy button');
copyPathButton.onclick({ stopPropagation() {} });
assert.equal(tooltipPathHarness.getCopiedText(), '$.items[0].key');

console.log('json parser repair guards passed');
