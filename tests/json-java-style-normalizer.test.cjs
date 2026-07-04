const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const normalizer = require('../json-java-style-normalizer.js');
const page = fs.readFileSync(path.resolve(__dirname, '../json-parser.html'), 'utf8');

assert.match(page, /<script src="json-java-style-normalizer\.js"><\/script>/);
assert.match(page, /JsonJavaStyleNormalizer\.normalizeJavaStyleObject\(raw\)/);
assert.doesNotMatch(page, /function normalizeJavaStyleObject\(raw\)/);
assert.doesNotMatch(page, /function quoteJavaMapValuesOutsideStrings\(raw\)/);

assert.strictEqual(
    normalizer.normalizeJavaStyleObject('FaultPoint{name=alpha, enabled=true, count=3}'),
    "{name:'alpha', enabled:true, count:3}"
);

assert.strictEqual(
    normalizer.normalizeJavaStyleObject("[FaultPoint{name='x', info={host=db01, port=3306}}, FaultPoint{name=y}]"),
    "[{name:'x', info:{host:'db01', port:3306}}, {name:'y'}]"
);

assert.strictEqual(
    normalizer.normalizeJavaStyleObject('{"expr":"a=b","value":1}'),
    '{"expr":"a=b","value":1}'
);

assert.strictEqual(
    normalizer.normalizeJavaStyleObject("{name=service.name', status=ok}"),
    "{name:'service.name', status:'ok'}"
);

assert.strictEqual(normalizer.hasUnquotedEquals('"a=b"'), false);
assert.strictEqual(normalizer.hasUnquotedEquals('a=b'), true);
assert.strictEqual(normalizer.replaceEqualsOutsideStrings('"a=b"=c'), '"a=b":c');

console.log('json java style normalizer passed');
