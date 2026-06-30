const assert = require('node:assert');
const path = require('node:path');

const keyPaths = require(path.resolve(__dirname, '../json-key-paths.js'));

const data = {
    user: {
        id: 1,
        profile: {
            name: 'alpha',
        },
    },
    items: [
        { id: 10, name: 'first' },
        { id: 11, meta: { enabled: true } },
    ],
    tags: ['ops', 'dev'],
    'a.b': {
        value: 42,
    },
};

assert.deepStrictEqual(keyPaths.extractJsonKeyPaths(data), [
    'user',
    'user.id',
    'user.profile',
    'user.profile.name',
    'items',
    'items[].id',
    'items[].name',
    'items[].meta',
    'items[].meta.enabled',
    'tags',
    'tags[]',
    '["a.b"]',
    '["a.b"].value',
]);

assert.deepStrictEqual(keyPaths.extractJsonKeyPaths([{ id: 1 }, { name: 'beta' }]), [
    '[].id',
    '[].name',
]);

assert.deepStrictEqual(keyPaths.extractJsonKeyPaths(null), []);

console.log('json key paths behavior passed');
