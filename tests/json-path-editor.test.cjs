const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const editor = require(path.resolve(__dirname, '../json-path-editor.js'));

const source = {
    name: 'root',
    nested: {
        list: [{ value: 1 }, { value: 2 }],
        oldKey: 'keep-order',
        tail: true,
    },
};

assert.strictEqual(editor.setValueAtPath(source, ['nested', 'list', 1, 'value'], 20), source);
assert.strictEqual(source.nested.list[1].value, 20);

const replacedRoot = editor.setValueAtPath(source, [], { root: true });
assert.deepStrictEqual(replacedRoot, { root: true });

const renameSource = {
    first: 1,
    second: {
        oldKey: 'value',
        after: 'tail',
    },
    third: 3,
};
assert.strictEqual(editor.renameKeyAtPath(renameSource, ['second'], 'oldKey', 'newKey'), renameSource);
assert.deepStrictEqual(Object.keys(renameSource.second), ['newKey', 'after']);
assert.strictEqual(renameSource.second.newKey, 'value');

const rootRenamed = editor.renameKeyAtPath(renameSource, [], 'second', 'renamed');
assert.deepStrictEqual(Object.keys(rootRenamed), ['first', 'renamed', 'third']);
assert.strictEqual(rootRenamed.renamed.newKey, 'value');

const arrayParent = { items: [{ oldKey: 1 }] };
assert.strictEqual(editor.renameKeyAtPath(arrayParent, ['items'], 'oldKey', 'newKey'), arrayParent);
assert.deepStrictEqual(arrayParent.items, [{ oldKey: 1 }]);

const page = fs.readFileSync(path.resolve(__dirname, '../json-parser.html'), 'utf8');
const collision = { a: 1, b: 2 };
assert.throws(() => editor.renameKeyAtPath(collision, [], 'a', 'b'), /已存在/);
assert.deepStrictEqual(collision, { a: 1, b: 2 });
const special = editor.renameKeyAtPath({ original: 1 }, [], 'original', '__proto__');
assert.strictEqual(JSON.stringify(special), '{"__proto__":1}');
editor.setValueAtPath(special, ['__proto__'], { kept: true });
assert.strictEqual(JSON.stringify(special), '{"__proto__":{"kept":true}}');
assert.throws(() => editor.setValueAtPath({}, ['__proto__', 'polluted'], true), /路径/);
assert.strictEqual({}.polluted, undefined);
const nestedSpecial = { child: { original: 1 } };
editor.renameKeyAtPath(nestedSpecial, ['child'], 'original', '__proto__');
assert.strictEqual(JSON.stringify(nestedSpecial), '{"child":{"__proto__":1}}');
assert.match(page, /<script src="json-path-editor\.js"><\/script>/);
assert.match(page, /JsonPathEditor\.setValueAtPath\(currentObj, path, value\)/);
assert.match(page, /JsonPathEditor\.renameKeyAtPath\(currentObj, parentPath, oldKey, newKey\)/);

console.log('json path editor behavior and integration passed');
