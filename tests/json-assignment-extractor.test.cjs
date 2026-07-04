const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const extractor = require('../json-assignment-extractor.js');
const page = fs.readFileSync(path.resolve(__dirname, '../json-parser.html'), 'utf8');

assert.match(page, /<script src="json-assignment-extractor\.js"><\/script>/);
assert.match(page, /JsonAssignmentExtractor\.extractJsonValueFromAssignmentLog\(raw\)/);
assert.doesNotMatch(page, /function extractJsonValueFromAssignmentLog\(raw\)/);
assert.doesNotMatch(page, /function looksLikeBracketPrefixedAssignmentLog\(raw\)/);
assert.doesNotMatch(page, /function findJsonAssignmentValueStart\(raw\)/);
assert.doesNotMatch(page, /function findBalancedJsonValueEnd\(raw, start\)/);

assert.strictEqual(
    extractor.extractJsonValueFromAssignmentLog('[trace][Feign]params={"cluster":"tc-jht03","productId":"L03"} tail'),
    '{"cluster":"tc-jht03","productId":"L03"}'
);

assert.strictEqual(
    extractor.extractJsonValueFromAssignmentLog('prefix payload=[{"id":1},{"id":2}] suffix'),
    '[{"id":1},{"id":2}]'
);

assert.strictEqual(
    extractor.extractJsonValueFromAssignmentLog('{"already":"json"}'),
    '{"already":"json"}'
);

assert.strictEqual(
    extractor.extractJsonValueFromAssignmentLog('[not][assignment] plain text'),
    '[not][assignment] plain text'
);

assert.strictEqual(
    extractor.findJsonAssignmentValueStart('text a="x=y" payload={"ok":true}'),
    21
);

assert.strictEqual(
    extractor.findBalancedJsonValueEnd('payload={"a":[{"b":"}"}]} trailing', 8),
    24
);

assert.strictEqual(
    extractor.findBalancedJsonValueEnd('payload={"a":[1,2}', 8),
    -1
);

console.log('json assignment extractor passed');
