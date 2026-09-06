const assert = require('node:assert');
const path = require('node:path');

const stringFields = require(path.resolve(__dirname, '../json-string-fields.js'));

const data = {
    id: 1,
    payload: '{"name":"alpha","meta":{"enabled":true}}',
    listText: '[{"id":1},{"id":2}]',
    plain: 'not json',
    numberText: '123',
    nested: {
        escaped: '{\\"bad\\":true}',
        empty: '',
    },
};

assert.deepStrictEqual(stringFields.collectStringifiedJsonFields(data), [
    {
        path: ['payload'],
        pathText: 'payload',
        type: 'object',
        value: '{"name":"alpha","meta":{"enabled":true}}',
        parsed: { name: 'alpha', meta: { enabled: true } },
    },
    {
        path: ['listText'],
        pathText: 'listText',
        type: 'array',
        value: '[{"id":1},{"id":2}]',
        parsed: [{ id: 1 }, { id: 2 }],
    },
]);

const expanded = stringFields.expandStringifiedJsonFields(data);
assert.deepStrictEqual(expanded.expandedPaths, [['payload'], ['listText']]);
assert.deepStrictEqual(expanded.value.payload, { name: 'alpha', meta: { enabled: true } });
assert.deepStrictEqual(expanded.value.listText, [{ id: 1 }, { id: 2 }]);
assert.equal(expanded.value.plain, 'not json');
assert.equal(expanded.value.numberText, '123');
assert.equal(expanded.value.nested.escaped, '{\\"bad\\":true}');
assert.notEqual(expanded.value, data);

const singleExpanded = stringFields.expandStringifiedJsonFieldAtPath(data, ['payload']);
assert.deepStrictEqual(singleExpanded.expandedPath, ['payload']);
assert.deepStrictEqual(singleExpanded.value.payload, { name: 'alpha', meta: { enabled: true } });
assert.equal(singleExpanded.value.listText, '[{"id":1},{"id":2}]');

const skippedSingleExpanded = stringFields.expandStringifiedJsonFieldAtPath(data, ['plain']);
assert.equal(skippedSingleExpanded.expandedPath, null);
assert.deepStrictEqual(skippedSingleExpanded.value, data);

const restored = stringFields.restoreStringifiedJsonFields(expanded.value, expanded.expandedPaths);
assert.equal(restored.payload, '{"name":"alpha","meta":{"enabled":true}}');
assert.equal(restored.listText, '[{"id":1},{"id":2}]');
assert.equal(restored.plain, 'not json');

const singleRestored = stringFields.restoreStringifiedJsonFieldAtPath(expanded.value, ['payload']);
assert.deepStrictEqual(singleRestored.restoredPath, ['payload']);
assert.equal(singleRestored.value.payload, '{"name":"alpha","meta":{"enabled":true}}');
assert.deepStrictEqual(singleRestored.value.listText, [{ id: 1 }, { id: 2 }]);

assert.deepStrictEqual(stringFields.collectStringifiedJsonFields([{ data: '{"ok":true}' }]), [
    {
        path: [0, 'data'],
        pathText: '[0].data',
        type: 'object',
        value: '{"ok":true}',
        parsed: { ok: true },
    },
]);

const rootExpanded = stringFields.expandStringifiedJsonFieldAtPath('{"ok":true}', []);
assert.deepStrictEqual(rootExpanded.value, { ok: true });
assert.strictEqual(stringFields.restoreStringifiedJsonFieldAtPath(rootExpanded.value, []).value, '{"ok":true}');
const specialField = JSON.parse('{"__proto__":"{\\"ok\\":true}"}');
assert.strictEqual(JSON.stringify(stringFields.expandStringifiedJsonFieldAtPath(specialField, ['__proto__']).value), '{"__proto__":{"ok":true}}');

// Restoring a parent must preserve JSON strings expanded inside it, while
// leaving unrelated expanded siblings untouched and keeping edits to the data.
const nestedOriginal = {
    payload: JSON.stringify({ nested: JSON.stringify([{ value: JSON.stringify({ ok: true }) }]) }),
    other: JSON.stringify({ keep: true }),
};
const nestedPaths = [['payload'], ['payload', 'nested'], ['payload', 'nested', 0, 'value'], ['other']];
let nestedExpanded = nestedOriginal;
for (const fieldPath of nestedPaths) {
    nestedExpanded = stringFields.expandStringifiedJsonFieldAtPath(nestedExpanded, fieldPath).value;
}
const nestedRestored = stringFields.restoreStringifiedJsonFieldAtPath(nestedExpanded, ['payload'], nestedPaths);
assert.strictEqual(nestedRestored.value.payload, nestedOriginal.payload);
assert.deepStrictEqual(nestedRestored.value.other, { keep: true });
assert.deepStrictEqual(nestedExpanded.payload.nested[0].value, { ok: true });

nestedExpanded.payload.nested[0].value.ok = false;
const staleAndDuplicatePaths = [
    ...nestedPaths, ['payload', 'nested', '0', 'value'], ['payload', 'missing', 'child'],
    ['payload', '__proto__'], ['payload', 'nested', 0, 'value', 'ok', 'child'], null, 'payload',
];
const editedRestored = stringFields.restoreStringifiedJsonFieldAtPath(nestedExpanded, ['payload'], staleAndDuplicatePaths);
const restoredArray = JSON.parse(JSON.parse(editedRestored.value.payload).nested);
assert.deepStrictEqual(JSON.parse(restoredArray[0].value), { ok: false });
assert.deepStrictEqual(editedRestored.value.other, { keep: true });

const nestedRoot = stringFields.restoreStringifiedJsonFieldAtPath(nestedExpanded.payload, [], [
    [], ['nested'], ['nested', 0, 'value'], ['nested'], ['missing', 'child'],
]);
assert.strictEqual(nestedRoot.value, editedRestored.value.payload);
assert.strictEqual(stringFields.restoreStringifiedJsonFields(nestedExpanded.payload, [
    [], ['nested'], ['nested', 0, 'value'],
]), editedRestored.value.payload);

const specialNestedOriginal = JSON.parse('{"__proto__":"{\\"constructor\\":\\"{\\\\\\"ok\\\\\\":true}\\"}"}');
const specialNestedPaths = [['__proto__'], ['__proto__', 'constructor']];
let specialNestedExpanded = specialNestedOriginal;
for (const fieldPath of specialNestedPaths) {
    specialNestedExpanded = stringFields.expandStringifiedJsonFieldAtPath(specialNestedExpanded, fieldPath).value;
}
assert.deepStrictEqual(stringFields.restoreStringifiedJsonFieldAtPath(
    specialNestedExpanded, ['__proto__'], specialNestedPaths,
).value, specialNestedOriginal);
const ordinaryObject = {};
const inheritedRestore = stringFields.restoreStringifiedJsonFieldAtPath(ordinaryObject, ['__proto__']);
assert.strictEqual(inheritedRestore.restoredPath, null);
assert.strictEqual(inheritedRestore.value, ordinaryObject);
assert.deepStrictEqual(stringFields.restoreStringifiedJsonFields(ordinaryObject, [['__proto__']]), {});

console.log('json string fields behavior passed');
