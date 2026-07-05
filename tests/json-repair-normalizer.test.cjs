const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const normalizer = require('../json-repair-normalizer.js');
const page = fs.readFileSync(path.resolve(__dirname, '../json-parser.html'), 'utf8');

assert.match(page, /<script src="json-repair-normalizer\.js"><\/script>/);
assert.match(page, /JsonRepairNormalizer\.stripCommentsOutsideStrings\(raw\)/);
assert.match(page, /JsonRepairNormalizer\.fixChineseColons\(raw\)/);
assert.match(page, /JsonRepairNormalizer\.addMissingCommas\(raw\)/);
assert.match(page, /JsonRepairNormalizer\.addQuotesToUnquotedStrings\(raw\)/);
assert.doesNotMatch(page, /function stripCommentsOutsideStrings\(raw\)/);
assert.doesNotMatch(page, /function fixChineseColons\(raw\)/);
assert.doesNotMatch(page, /function addMissingCommas\(raw\)/);
assert.doesNotMatch(page, /function addQuotesToUnquotedStrings\(raw\)/);

assert.strictEqual(
    normalizer.stripCommentsOutsideStrings('{"url":"http://demo","a":1}// comment\n/* block */{"b":2}'),
    '{"url":"http://demo","a":1}\n{"b":2}'
);

assert.strictEqual(
    normalizer.fixChineseColons('logType ： TCPSNOOP\n_searchSort : 1768352359227000000,-9223372036854775808\nenabled: true'),
    '"logType": "TCPSNOOP"\n"_searchSort": ["1768352359227000000","-9223372036854775808"]\n"enabled": true'
);

assert.strictEqual(
    normalizer.addMissingCommas('{\n  "name": "demo"\n  "age": 18\n  "active": true\n}'),
    '{\n  "name": "demo",\n  "age": 18,\n  "active": true\n}'
);

assert.strictEqual(
    normalizer.addQuotesToUnquotedStrings('{nickname: 张三, age: 18, active: true, unknown: undefined}'),
    '{"nickname": "张三", "age": 18, "active": true, "unknown": null}'
);

assert.strictEqual(normalizer.isCommasSeparatedNumbers('1,-2,3.5'), true);
assert.strictEqual(normalizer.isCommasSeparatedNumbers('1,abc'), false);
assert.strictEqual(normalizer.isJsonPrimitive('1.2e-3'), true);
assert.strictEqual(normalizer.isJsonPrimitive('demo'), false);

console.log('json repair normalizer passed');
