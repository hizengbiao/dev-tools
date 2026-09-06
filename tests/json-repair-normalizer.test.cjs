const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const normalizer = require('../json-repair-normalizer.js');
const page = fs.readFileSync(path.resolve(__dirname, '../json-parser.html'), 'utf8');

assert.match(page, /<script src="json-repair-normalizer\.js\?v=2\.00"><\/script>/);

const escapedRoutes = String.raw`[{\\"hosts\\":[\\"imgcache-uat.alb-uat.cmbchina.cn\\"],\\"methods\\":[],\\"paths\\":[\\"/api\\"],\\"regex\_priority\\":0,\\"preserve\_host\\":false,\\"protocols\\":[\\"http\\",\\"https\\"],\\"strip\_path\\":false}]`;
const normalizedEscapedRoutes = normalizer.normalizeEscapedJsonContainer(escapedRoutes);
assert.deepStrictEqual(JSON.parse(normalizedEscapedRoutes), [{
    hosts: ['imgcache-uat.alb-uat.cmbchina.cn'],
    methods: [],
    paths: ['/api'],
    regex_priority: 0,
    preserve_host: false,
    protocols: ['http', 'https'],
    strip_path: false,
}]);

const malformedEscapedStarted = Date.now();
assert.doesNotThrow(() => normalizer.addQuotesToUnquotedStrings(String.raw`[{\"broken\":}]`));
assert.ok(Date.now() - malformedEscapedStarted < 200, 'malformed escaped input must not hang');
assert.match(page, /JsonRepairNormalizer\.stripCommentsOutsideStrings\(raw\)/);
assert.match(page, /JsonRepairNormalizer\.fixChineseColons\(raw\)/);
assert.match(page, /JsonRepairNormalizer\.addMissingCommas\(raw\)/);
assert.match(page, /JsonRepairNormalizer\.addQuotesToUnquotedStrings\(raw\)/);
assert.match(page, /JsonRepairNormalizer\.stripLeadingLabelBeforeJson\(raw\)/);
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
    normalizer.stripLeadingLabelBeforeJson('消费到云见各决策子系统异常信号：{"objectType":"K8sWorker","impactRangeObjectIdList":[]}'),
    '{"objectType":"K8sWorker","impactRangeObjectIdList":[]}'
);
assert.strictEqual(
    normalizer.stripLeadingLabelBeforeJson('{"outer":{"inner":1}}'),
    '{"outer":{"inner":1}}'
);

for (const array of ['[alpha]', '[[alpha]]', '[[1,2]]', '[["x"]]']) {
    for (const ending of ['', ',', ';']) {
        assert.strictEqual(normalizer.stripJsonLogTags(array + ending), array + ending);
    }
}
assert.strictEqual(normalizer.stripJsonLogTags('[TAG]{"ok":true}[/TAG]'), '{"ok":true}');
assert.strictEqual(normalizer.stripJsonLogTags('[[tag]]{"ok":true}[[/tag]]'), '{"ok":true}');
assert.strictEqual(normalizer.stripJsonLogTags('[TAG]{"ok":true}'), '{"ok":true}');
assert.strictEqual(normalizer.stripJsonLogTags('{"ok":true}[TAG]'), '{"ok":true}');
assert.strictEqual(normalizer.stripJsonLogTags('[TAG][[1,2]][/TAG];'), '[[1,2]];');
assert.strictEqual(normalizer.stripJsonLogTags('[TAG][null][/TAG]'), '[null]');
assert.strictEqual(normalizer.stripJsonLogTags('[trace][TAG]{"text":"[tag]"}[/TAG]'), '{"text":"[tag]"}');
assert.strictEqual(normalizer.stripJsonLogTags('[TAG][OTHER]'), '[TAG][OTHER]');
assert.strictEqual(normalizer.stripJsonLogTags('[TAG]'), '[TAG]');
assert.strictEqual(normalizer.stripJsonLogTags('{"text":"unfinished [TAG]'), '{"text":"unfinished [TAG]');

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
