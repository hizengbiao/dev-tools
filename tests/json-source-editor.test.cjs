const assert = require('node:assert/strict');
const { locateError } = require('../json-source-editor.js');
assert.equal(locateError('{"ok":true}'), null);
assert.deepEqual(locateError('{\n  "service": {3\n}'), { offset: 16, line: 2, column: 15 });
assert.deepEqual(locateError('\n\n {"a": ?}'), { offset: 9, line: 3, column: 8 });
assert.deepEqual(locateError('{\r\n"a": ?}'), { offset: 8, line: 2, column: 6 });
assert.deepEqual(locateError('{"a":'), { offset: 5, line: 1, column: 6 });
assert.deepEqual(locateError('{"中文😀": ?}'), { offset: 9, line: 1, column: 10 });
console.log('JSON source error locations passed');
