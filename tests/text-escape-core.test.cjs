const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const core = require('../text-escape-core.js');
const page = fs.readFileSync(path.resolve(__dirname, '../text_escape_formatter_final.html'), 'utf8');

assert.match(page, /<script src="text-escape-core\.js"><\/script>/);
assert.match(page, /TextEscapeCore\.decodeToReadableText/);
assert.match(page, /TextEscapeCore\.mergeConcatenatedStrings/);
assert.match(page, /TextEscapeCore\.restoreMappedVariables/);
assert.match(page, /TextEscapeCore\.formatQuotedCopyText/);
assert.match(page, /TextEscapeCore\.convertMultilineToCodeString/);
assert.match(page, /TextEscapeCore\.cleanStackLog/);
assert.match(page, /TextEscapeCore\.exportMappingPairs/);
assert.match(page, /TextEscapeCore\.importMappingPairs/);

assert.strictEqual(
    core.decodeToReadableText('"SQ#at com.huawei\\n"\n                + "\\tat com.mysql.ConnectionFactoryImpl\\n"'),
    'SQ#at com.huawei\n\tat com.mysql.ConnectionFactoryImpl\n'
);

assert.strictEqual(
    core.decodeToReadableText('\\x48\\x69 \\u{4e2d}', { languageMode: 'javascript' }),
    'Hi 中'
);

assert.strictEqual(
    core.decodeToReadableText('\\x48\\x69 \\U00004e2d', { languageMode: 'python' }),
    'Hi 中'
);

assert.strictEqual(
    core.decodeToReadableText("O''Reilly\\n", { languageMode: 'sql' }),
    "O'Reilly\\n"
);

assert.strictEqual(
    core.encodeToEscapedString("O'Reilly\\path\n"),
    "O'Reilly\\\\path\\n"
);

assert.strictEqual(
    core.encodeToEscapedString("O'Reilly\\path\n", { languageMode: 'sql' }),
    "O''Reilly\\path\n"
);

assert.strictEqual(
    core.convertMultilineToCodeString('alpha\nbeta', { languageMode: 'java', keepTrailingNewline: true }),
    '"alpha\\n"\n        + "beta"'
);

assert.strictEqual(
    core.convertMultilineToCodeString('alpha\nbeta\n', { languageMode: 'java', keepTrailingNewline: true }),
    '"alpha\\n"\n        + "beta\\n"'
);

assert.strictEqual(
    core.convertMultilineToCodeString('alpha\nbeta\n', { languageMode: 'java', keepTrailingNewline: false }),
    '"alpha"\n        + "beta"'
);

assert.strictEqual(
    core.convertMultilineToCodeString('He said "Hi"\nC:\\temp', { languageMode: 'java', keepTrailingNewline: true }),
    '"He said \\"Hi\\"\\n"\n        + "C:\\\\temp"'
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
    core.cleanStackLog(noisyStack, { keepOriginalLines: false }),
    [
        'java.lang.RuntimeException: boom',
        '\tat com.example.Service.run(Service.java:10)',
        'Caused by: java.lang.IllegalStateException: bad',
        '\tat com.example.Dao.query(Dao.java:22)',
    ].join('\n')
);

assert.strictEqual(
    core.cleanStackLog(noisyStack, { keepOriginalLines: true }),
    [
        'java.lang.RuntimeException: boom',
        '\tat com.example.Service.run(Service.java:10)',
        'requestId=abc',
        'Caused by: java.lang.IllegalStateException: bad',
        '\tat com.example.Dao.query(Dao.java:22)',
    ].join('\n')
);

assert.strictEqual(
    core.decodeToReadableText('"SQ#at com.huawei\\n" + stackLine + "\\tat com.mysql.ConnectionFactoryImpl\\n"'),
    '"SQ#at com.huawei\n" + stackLine + "\tat com.mysql.ConnectionFactoryImpl\n"'
);

assert.strictEqual(
    core.formatQuotedCopyText('SQ#at com.huawei\\n\\tat com.mysql.ConnectionFactoryImpl\\n'),
    '"SQ#at com.huawei\\n\\tat com.mysql.ConnectionFactoryImpl\\n"'
);

const jdbcSnippet = `"(jdbc:mysql://[^,\\\\s]+|jdbc:postgresql://[^,\\\\s]+|jdbc:tdsql-mysql://[^,\\\\s]+|jdbc:postgresql://[^,\\\\s]+"
                    + "|jdbc:gaussdb://[^,\\\\s]+|jdbc:opengauss://[^,\\\\s]+|jdbc:olap://[^,\\\\s]+|jdbc:oracle:(thin|oci):@[^,\\\\s]*"
                    + "|jdbc:sqlserver://[^,\\\\s]+)"`;

assert.strictEqual(
    core.mergeConcatenatedStrings(jdbcSnippet),
    '(jdbc:mysql://[^,\\s]+|jdbc:postgresql://[^,\\s]+|jdbc:tdsql-mysql://[^,\\s]+|jdbc:postgresql://[^,\\s]+|jdbc:gaussdb://[^,\\s]+|jdbc:opengauss://[^,\\s]+|jdbc:olap://[^,\\s]+|jdbc:oracle:(thin|oci):@[^,\\s]*|jdbc:sqlserver://[^,\\s]+)'
);

assert.strictEqual(
    core.mergeConcatenatedStrings('"jdbc:" + dbType + "://host"'),
    'jdbc:\n+ dbType +\n://host'
);

const mappings = core.normalizeMappingPairs([
    { left: 'SERVICE_NAME', right: 'SVNM.getName()' },
    { left: 'environment.getName()', right: 'ENV_NAME' }
]);

assert.deepStrictEqual(mappings, [
    { left: 'SERVICE_NAME', right: 'SVNM.getName()' },
    { left: 'environment.getName()', right: 'ENV_NAME' }
]);

assert.strictEqual(
    core.exportMappingPairs(mappings),
    '[\n  {\n    "left": "SERVICE_NAME",\n    "right": "SVNM.getName()"\n  },\n  {\n    "left": "environment.getName()",\n    "right": "ENV_NAME"\n  }\n]'
);

assert.deepStrictEqual(
    core.importMappingPairs(
        mappings,
        '[{"left":"SERVICE_NAME","right":"SVNM.getName()"},{"left":"REGION","right":"context.region()"}]'
    ),
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

assert.deepStrictEqual(
    core.importMappingPairs(mappings, '[{"left":"REGION","right":"context.region()"}]', { replace: true }),
    {
        mappings: [{ left: 'REGION', right: 'context.region()' }],
        importedCount: 1,
        skippedCount: 0,
        mode: 'replace'
    }
);

assert.throws(
    () => core.importMappingPairs(mappings, '{"left":"REGION"}'),
    /映射 JSON 必须是数组/
);

assert.strictEqual(
    core.mergeConcatenatedStrings(
        '"数据库${objectName}的" + SVNM.getName() + "不在已知服务列表里"',
        mappings
    ),
    '数据库${objectName}的SERVICE_NAME不在已知服务列表里'
);

assert.strictEqual(
    core.restoreMappedVariables(
        '"数据库${objectName}的SERVICE_NAME不在已知服务列表里"',
        mappings
    ),
    '"数据库${objectName}的" + SVNM.getName() + "不在已知服务列表里"'
);

console.log('text escape core passed');
