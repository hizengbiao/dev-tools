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

assert.strictEqual(
    core.decodeToReadableText('"SQ#at com.huawei\\n"\n                + "\\tat com.mysql.ConnectionFactoryImpl\\n"'),
    'SQ#at com.huawei\n\tat com.mysql.ConnectionFactoryImpl\n'
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
