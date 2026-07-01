const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const query = require(path.resolve(__dirname, '../json-path-query.js'));

const data = {
    data: [
        { name: 'alpha', meta: { enabled: true } },
        { name: 'beta', meta: { enabled: false } },
    ],
    'a.b': {
        value: 42,
    },
};

assert.deepStrictEqual(query.parseJsonPath('$.data[0].name'), ['data', 0, 'name']);
assert.deepStrictEqual(query.parseJsonPath('data[1].meta.enabled'), ['data', 1, 'meta', 'enabled']);
assert.deepStrictEqual(query.parseJsonPath('$["a.b"].value'), ['a.b', 'value']);

assert.deepStrictEqual(query.queryJsonPath(data, '$.data[1].name'), {
    found: true,
    path: ['data', 1, 'name'],
    value: 'beta',
});

assert.deepStrictEqual(query.queryJsonPath(data, '$.data[9].name'), {
    found: false,
    path: ['data', 9],
    value: undefined,
    message: '路径不存在：$.data[9]',
});

assert.throws(() => query.parseJsonPath('$.data[]'), /无效的 JSON Path/);

const page = fs.readFileSync(path.resolve(__dirname, '../json-parser.html'), 'utf8');
assert.match(page, /<script src="json-path-query\.js"><\/script>/);
assert.match(page, /id="json-path-input"/);
assert.match(page, /id="json-path-result"/);
assert.match(page, /function handleJsonPathQuery\(\)/);
assert.match(page, /JsonPathQuery\.queryJsonPath\(target, pathInput\.value\)/);
assert.match(page, /function copyJsonPathResult\(\)/);
assert.match(page, /<span>V1\.84<\/span>/);
assert.match(page, /<div class="changelog-version">V1\.84<\/div>/);
assert.match(page, /<div class="changelog-version">V1\.82<\/div>/);
assert.match(page, /<div class="changelog-version">V1\.83<\/div>/);
assert.match(page, /<div class="changelog-date">2026年6月30日<\/div>[\s\S]*?<div class="changelog-version">V1\.82<\/div>/);

console.log('json path query behavior passed');
