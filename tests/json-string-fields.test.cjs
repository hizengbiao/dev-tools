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

const restored = stringFields.restoreStringifiedJsonFields(expanded.value, expanded.expandedPaths);
assert.equal(restored.payload, '{"name":"alpha","meta":{"enabled":true}}');
assert.equal(restored.listText, '[{"id":1},{"id":2}]');
assert.equal(restored.plain, 'not json');

assert.deepStrictEqual(stringFields.collectStringifiedJsonFields([{ data: '{"ok":true}' }]), [
    {
        path: [0, 'data'],
        pathText: '[0].data',
        type: 'object',
        value: '{"ok":true}',
        parsed: { ok: true },
    },
]);

console.log('json string fields behavior passed');
