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
assert.match(page, /<script src="changelog\.js"><\/script>/);
assert.match(page, /<script src="editor-lines\.js"><\/script>/);
assert.match(page, /<script src="diff-viewer\.js"><\/script>/);
assert.match(page, /<script src="text-escape-core\.js"><\/script>/);
assert.match(page, /<div class="container">/);
assert.match(page, /<div class="tool-title">/);
assert.match(page, /class="version-info" onclick="showChangelog\(\)"/);
assert.match(page, /<span>V1\.13<\/span>/);
assert.match(page, /<div class="changelog-date">2026年7月4日<\/div>[\s\S]*?<div class="changelog-version">V1\.13<\/div>[\s\S]*?<div class="changelog-version">V1\.12<\/div>[\s\S]*?<div class="changelog-version">V1\.11<\/div>[\s\S]*?<div class="changelog-version">V1\.10<\/div>/);
assert.match(page, /<div class="changelog-version">V1\.13<\/div>/);
assert.match(page, /<div class="changelog-version">V1\.12<\/div>/);
assert.match(page, /<div class="changelog-version">V1\.11<\/div>/);
assert.match(page, /<div class="changelog-version">V1\.10<\/div>/);
assert.match(page, /<div class="changelog-version">V1\.09<\/div>/);
assert.match(page, /<div class="changelog-version">V1\.08<\/div>/);
assert.match(page, /<div class="changelog-version">V1\.07<\/div>/);
assert.match(page, /<div class="changelog-version">V1\.06<\/div>/);
assert.match(page, /<div class="changelog-date">2026年6月24日<\/div>[\s\S]*?<div class="changelog-version">V1\.09<\/div>[\s\S]*?<div class="changelog-version">V1\.08<\/div>[\s\S]*?<div class="changelog-version">V1\.07<\/div>[\s\S]*?<div class="changelog-version">V1\.06<\/div>/);
assert.match(page, /<div class="changelog-version">V1\.05<\/div>/);
assert.match(page, /<div class="changelog-version">V1\.04<\/div>/);
assert.match(page, /<div class="changelog-version">V1\.00<\/div>/);

assert.match(page, /id="decodeBtn"/);
assert.match(page, /id="encodeBtn"/);
assert.match(page, /id="mergeStringsBtn"/);
assert.match(page, /id="restoreVariablesBtn"/);
assert.match(page, /id="codeStringBtn"/);
assert.match(page, /id="keepTrailingNewline"/);
assert.match(page, /id="cleanStackBtn"/);
assert.match(page, /id="keepOriginalStackLines"/);
assert.match(page, /id="languageMode"/);
assert.match(page, /data-mode-tooltip="JavaScript/);
assert.match(page, /data-mode-tooltip="SQL/);
assert.match(page, /id="mappingList"/);
assert.match(page, /id="addMappingBtn"/);
assert.match(page, /id="exportMappingsBtn"/);
assert.match(page, /id="importMappingsBtn"/);
assert.match(page, /id="inputLineNumbers"/);
assert.match(page, /id="outputLineNumbers"/);
assert.match(page, /id="inputHighlight"/);
assert.match(page, /id="outputHighlight"/);
assert.match(page, /id="diffSummary"/);
assert.match(page, /class="editor-shell"/);
assert.match(page, /class="editor-stage"/);
assert.match(page, /data-tooltip=/);
assert.match(page, /function decodeToReadableText\(raw, options = \{\}\)/);
assert.match(page, /function encodeToEscapedString\(raw, options = \{\}\)/);
assert.match(page, /function getSelectedLanguageMode\(\)/);
assert.match(page, /function convertMultilineToCodeString\(raw, options = \{\}\)/);
assert.match(page, /function cleanStackLog\(raw, options = \{\}\)/);
assert.match(page, /function decodeStringLiteralForMerge\(text\)/);
assert.match(page, /function getReadableDecodeSource\(raw\)/);
assert.match(page, /function formatQuotedCopyText\(text\)/);
assert.match(page, /function mergeConcatenatedStrings\(raw, mappings = \[\]\)/);
assert.match(page, /function normalizeMappingPairs\(pairs\)/);
assert.match(page, /function exportMappingPairs\(pairs\)/);
assert.match(page, /function importMappingPairs\(existing, raw, options = \{\}\)/);
assert.match(page, /function restoreMappedVariables\(raw, mappings\)/);
assert.match(page, /function refreshLineNumbers\(textarea, lineNumbers\)/);
assert.match(page, /function syncLineNumberScroll\(textarea, lineNumbers\)/);
assert.match(page, /function buildDiffSegments\(original, result\)/);
assert.match(page, /function renderDiff\(\)/);
assert.match(page, /function syncEditorScroll\(textarea, highlight, lineNumbers\)/);
assert.doesNotMatch(page, /text-decoration:\s*line-through/);
assert.doesNotMatch(page, /function showChangelog\(\)/);
assert.doesNotMatch(page, /function closeChangelog\(\)/);
assert.doesNotMatch(page, /window\.showChangelog = showChangelog/);
assert.doesNotMatch(page, /window\.closeChangelog = closeChangelog/);

const elements = new Map();
function element(id) {
    if (!elements.has(id)) {
        elements.set(id, {
            id,
            value: '',
            textContent: '',
            className: '',
            style: {},
            scrollTop: 0,
            scrollLeft: 0,
            children: [],
            classList: {
                add() {},
                remove() {},
            },
            replaceChildren(...children) {
                this.children = children;
            },
            addEventListener() {},
            focus() {},
            select() {},
        });
    }
    return elements.get(id);
}

const context = {
    console,
    EditorLines: {
        buildLineNumbers(text) {
            return String(text || '').split('\n').map((_, index) => index + 1).join('\n');
        },
        refreshLineNumbers(textarea, lineNumbers) {
            lineNumbers.textContent = this.buildLineNumbers(textarea.value);
            this.syncLineNumberScroll(textarea, lineNumbers);
        },
        syncLineNumberScroll(textarea, lineNumbers) {
            lineNumbers.scrollTop = textarea.scrollTop;
        },
    },
    DiffViewer: {
        buildDiffSegments(original, result) {
            const source = fs.readFileSync(path.resolve(__dirname, '../diff-viewer.js'), 'utf8');
            const diffContext = { window: {}, module: { exports: {} } };
            diffContext.globalThis = diffContext;
            vm.runInNewContext(source, diffContext);
            return diffContext.module.exports.buildDiffSegments(original, result);
        },
        createDiffNode(documentRef, text, className = '') {
            const span = documentRef.createElement('span');
            span.textContent = text;
            span.className = className;
            return span;
        },
    },
    TextEscapeCore: require('../text-escape-core.js'),
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
                textContent: '',
                className: '',
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

function plainSegments(segments) {
    return JSON.parse(JSON.stringify(segments));
}

assert.deepStrictEqual(
    plainSegments(context.buildDiffSegments('a\\nb', 'a\nb')),
    [
        { type: 'equal', text: 'a' },
        { type: 'delete', text: '\\n' },
        { type: 'insert', text: '\n' },
        { type: 'equal', text: 'b' },
    ]
);

assert.strictEqual(
    context.decodeToReadableText('"SQ#at com.huawei\\n"\n                + "\\tat com.mysql.ConnectionFactoryImpl\\n"'),
    'SQ#at com.huawei\n\tat com.mysql.ConnectionFactoryImpl\n'
);

assert.strictEqual(
    context.decodeToReadableText('\\x48\\x69 \\u{4e2d}', { languageMode: 'javascript' }),
    'Hi 中'
);

assert.strictEqual(
    context.decodeToReadableText('\\x48\\x69 \\U00004e2d', { languageMode: 'python' }),
    'Hi 中'
);

assert.strictEqual(
    context.decodeToReadableText("O''Reilly\\n", { languageMode: 'sql' }),
    "O'Reilly\\n"
);

assert.strictEqual(
    context.encodeToEscapedString("O'Reilly\\path\n", { languageMode: 'sql' }),
    "O''Reilly\\path\n"
);

assert.strictEqual(
    context.convertMultilineToCodeString('alpha\nbeta', { languageMode: 'java', keepTrailingNewline: true }),
    '"alpha\\n"\n        + "beta"'
);

assert.strictEqual(
    context.convertMultilineToCodeString('alpha\nbeta\n', { languageMode: 'java', keepTrailingNewline: false }),
    '"alpha"\n        + "beta"'
);

const noisyStack = [
    '2026-07-04 10:00:00 ERROR [main] com.demo.App - java.lang.RuntimeException: boom',
    '',
    '2026-07-04 10:00:00 ERROR [main] com.demo.App -     at com.example.Service.run(Service.java:10)',
    'requestId=abc',
    '2026-07-04 10:00:00 ERROR [main] com.demo.App - Caused by: java.lang.IllegalStateException: bad',
    '        at com.example.Dao.query(Dao.java:22)',
].join('\n');

assert.strictEqual(
    context.cleanStackLog(noisyStack, { keepOriginalLines: false }),
    [
        'java.lang.RuntimeException: boom',
        '\tat com.example.Service.run(Service.java:10)',
        'Caused by: java.lang.IllegalStateException: bad',
        '\tat com.example.Dao.query(Dao.java:22)',
    ].join('\n')
);

assert.strictEqual(
    context.decodeToReadableText('"SQ#at com.huawei\\n" + stackLine + "\\tat com.mysql.ConnectionFactoryImpl\\n"'),
    '"SQ#at com.huawei\n" + stackLine + "\tat com.mysql.ConnectionFactoryImpl\n"'
);

assert.strictEqual(
    context.formatQuotedCopyText('SQ#at com.huawei\\n\\tat com.mysql.ConnectionFactoryImpl\\n'),
    '"SQ#at com.huawei\\n\\tat com.mysql.ConnectionFactoryImpl\\n"'
);

assert.strictEqual(
    context.formatQuotedCopyText('"SQ#at com.huawei\\n\\tat com.mysql.ConnectionFactoryImpl\\n"'),
    '"SQ#at com.huawei\\n\\tat com.mysql.ConnectionFactoryImpl\\n"'
);

const largeDiff = plainSegments(context.buildDiffSegments('a'.repeat(1100), 'b'.repeat(1100)));
assert.deepStrictEqual(
    largeDiff.map((segment) => ({ type: segment.type, length: segment.text.length })),
    [
        { type: 'delete', length: 1100 },
        { type: 'insert', length: 1100 },
    ]
);

elements.get('inputText').value = 'first\\nsecond';
elements.get('outputText').value = 'first\nsecond';
context.refreshStats();
assert.strictEqual(elements.get('inputHighlight').children.length > 0, true);
assert.strictEqual(elements.get('outputHighlight').children.length > 0, true);

elements.get('inputText').scrollTop = 32;
elements.get('inputText').scrollLeft = 14;
context.syncEditorScroll(
    elements.get('inputText'),
    elements.get('inputHighlight'),
    elements.get('inputLineNumbers')
);
assert.strictEqual(elements.get('inputHighlight').scrollTop, 32);
assert.strictEqual(elements.get('inputHighlight').scrollLeft, 14);
assert.strictEqual(elements.get('inputLineNumbers').scrollTop, 32);

const jdbcSnippet = `"(jdbc:mysql://[^,\\\\s]+|jdbc:postgresql://[^,\\\\s]+|jdbc:tdsql-mysql://[^,\\\\s]+|jdbc:postgresql://[^,\\\\s]+"
                    + "|jdbc:gaussdb://[^,\\\\s]+|jdbc:opengauss://[^,\\\\s]+|jdbc:olap://[^,\\\\s]+|jdbc:oracle:(thin|oci):@[^,\\\\s]*"
                    + "|jdbc:sqlserver://[^,\\\\s]+)"`;

assert.strictEqual(
    context.mergeConcatenatedStrings(jdbcSnippet),
    '(jdbc:mysql://[^,\\s]+|jdbc:postgresql://[^,\\s]+|jdbc:tdsql-mysql://[^,\\s]+|jdbc:postgresql://[^,\\s]+|jdbc:gaussdb://[^,\\s]+|jdbc:opengauss://[^,\\s]+|jdbc:olap://[^,\\s]+|jdbc:oracle:(thin|oci):@[^,\\s]*|jdbc:sqlserver://[^,\\s]+)'
);

assert.strictEqual(
    context.mergeConcatenatedStrings('"SQ#at com.huawei\\n" + "\\tat com.mysql.ConnectionFactoryImpl\\n"'),
    'SQ#at com.huawei\\n\\tat com.mysql.ConnectionFactoryImpl\\n'
);

assert.strictEqual(
    context.mergeConcatenatedStrings('"jdbc:" + dbType + "://host"'),
    'jdbc:\n+ dbType +\n://host'
);

const mappings = context.normalizeMappingPairs([
    { left: 'SERVICE_NAME', right: 'SVNM.getName()' },
    { left: 'environment.getName()', right: 'ENV_NAME' }
]);

assert.deepStrictEqual(
    JSON.parse(JSON.stringify(mappings)),
    [
        { left: 'SERVICE_NAME', right: 'SVNM.getName()' },
        { left: 'environment.getName()', right: 'ENV_NAME' }
    ]
);

assert.strictEqual(
    context.exportMappingPairs(mappings),
    '[\n  {\n    "left": "SERVICE_NAME",\n    "right": "SVNM.getName()"\n  },\n  {\n    "left": "environment.getName()",\n    "right": "ENV_NAME"\n  }\n]'
);

assert.deepStrictEqual(
    JSON.parse(JSON.stringify(context.importMappingPairs(
        mappings,
        '[{"left":"SERVICE_NAME","right":"SVNM.getName()"},{"left":"REGION","right":"context.region()"}]'
    ))),
    {
        mappings: [
            { left: 'SERVICE_NAME', right: 'SVNM.getName()' },
            { left: 'environment.getName()', right: 'ENV_NAME' },
            { left: 'REGION', right: 'context.region()' }
        ],
        importedCount: 1,
        skippedCount: 1,
        mode: 'merge'
    }
);

assert.strictEqual(
    context.mergeConcatenatedStrings(
        '"数据库${objectName}的" + SVNM.getName() + "不在已知服务列表里"',
        mappings
    ),
    '数据库${objectName}的SERVICE_NAME不在已知服务列表里'
);

assert.strictEqual(
    context.mergeConcatenatedStrings(
        '"数据库${objectName}的" + SERVICE_NAME + "不在已知服务列表里"',
        mappings
    ),
    '数据库${objectName}的SVNM.getName()不在已知服务列表里'
);

assert.strictEqual(
    context.mergeConcatenatedStrings(
        '"服务：" + unknownService + "，环境：" + environment.getName()',
        mappings
    ),
    '服务：\n+ unknownService +\n，环境：ENV_NAME'
);

assert.strictEqual(
    context.restoreMappedVariables(
        '"数据库${objectName}的SERVICE_NAME不在已知服务列表里"',
        mappings
    ),
    '"数据库${objectName}的" + SVNM.getName() + "不在已知服务列表里"'
);

assert.strictEqual(
    context.restoreMappedVariables(
        'SERVICE_NAME属于ENV_NAME，备用服务为SERVICE_NAME',
        mappings
    ),
    'SVNM.getName() + "属于" + environment.getName() + "，备用服务为" + SVNM.getName()'
);

assert.strictEqual(
    context.restoreMappedVariables(
        '"数据库${objectName}的SVNM.getName()不在已知服务列表里"',
        mappings
    ),
    '"数据库${objectName}的" + SERVICE_NAME + "不在已知服务列表里"'
);

const reversedMappings = context.normalizeMappingPairs([
    { left: 'SVNM.getName()', right: 'SERVICE_NAME' }
]);

assert.strictEqual(
    context.mergeConcatenatedStrings(
        '"数据库${objectName}的" + SVNM.getName() + "不在已知服务列表里"',
        reversedMappings
    ),
    '数据库${objectName}的SERVICE_NAME不在已知服务列表里'
);

assert.strictEqual(
    context.restoreMappedVariables(
        '"数据库${objectName}的SERVICE_NAME不在已知服务列表里"',
        reversedMappings
    ),
    '"数据库${objectName}的" + SVNM.getName() + "不在已知服务列表里"'
);

console.log('text escape formatter integration passed');
