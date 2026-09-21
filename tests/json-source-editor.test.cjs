const assert = require('node:assert/strict');
const { locateError } = require('../json-source-editor.js');
assert.equal(locateError("FaultChain{faultPoints=[FaultPoint{name='test', pushOperatorScore=1.0', maskable=false'}]}"), null);
assert.equal(locateError('ERROR payload: {"a": ?}'), null);
assert.equal(locateError('{"ok":true}'), null);
assert.deepEqual(locateError('{\n  "service": {3\n}'), { offset: 16, line: 2, column: 15 });
assert.deepEqual(locateError('\n\n {"a": ?}'), { offset: 9, line: 3, column: 8 });
assert.deepEqual(locateError('{\r\n"a": ?}'), { offset: 8, line: 2, column: 6 });
assert.deepEqual(locateError('{"a":'), { offset: 5, line: 1, column: 6 });
assert.deepEqual(locateError('{"中文😀": ?}'), { offset: 9, line: 1, column: 10 });
console.log('JSON source error locations passed');
const fragment = '"analyseResult":{\n    "summary"："数据库LV磁盘使用率高",\n    "boundary":"SERVER"\n}';
for (const text of [fragment, fragment + ',', '\n  ' + fragment, fragment.replaceAll('\n', '\r\n')]) {
    const result = locateError(text);
    assert.equal(result.offset, text.indexOf('：'));
    assert.equal(result.line, text.startsWith('\n') ? 3 : 2);
    assert.equal(result.column, 14);
}
assert.equal(locateError('"a": {"b": ?}').offset, 11);
const trailingComma = '"a": {"b": true},';
assert.equal(locateError(trailingComma).offset, trailingComma.length);
const url = '{"url":"http://example.test/a：b", "bad": ?}';
assert.equal(locateError(url).offset, url.indexOf('?'));
assert.deepEqual(locateError('"a": {broken}', 'Expected property name at position 6 (line 1 column 7)'), { offset: 6, line: 1, column: 7 });
assert.deepEqual(locateError('{\n"a": "\\q"}', 'Bad escaped character in JSON at position 9 (line 2 column 8)'), { offset: 9, line: 2, column: 8 });
