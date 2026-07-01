const assert = require('node:assert');
const path = require('node:path');

const search = require(path.resolve(__dirname, '../json-search-results.js'));

const data = {
    service: {
        name: 'order-service',
        status: 'UP',
    },
    items: [
        { id: 1, name: 'alpha' },
        { id: 2, name: 'beta' },
    ],
    'a.b': {
        value: 'special',
    },
};

assert.deepStrictEqual(search.searchJsonTree(data, 'name'), [
    {
        type: 'key',
        path: 'service.name',
        line: 3,
        preview: 'order-service',
    },
    {
        type: 'key',
        path: 'items[0].name',
        line: 9,
        preview: 'alpha',
    },
    {
        type: 'key',
        path: 'items[1].name',
        line: 13,
        preview: 'beta',
    },
]);

assert.deepStrictEqual(search.searchJsonTree(data, 'beta'), [
    {
        type: 'value',
        path: 'items[1].name',
        line: 13,
        preview: 'beta',
    },
]);

assert.deepStrictEqual(search.searchJsonTree(data, 'SPECIAL', { caseSensitive: false }), [
    {
        type: 'value',
        path: '["a.b"].value',
        line: 17,
        preview: 'special',
    },
]);

assert.deepStrictEqual(search.searchJsonTree(data, 'missing'), []);
assert.deepStrictEqual(search.searchJsonTree(null, 'name'), []);
assert.deepStrictEqual(search.searchJsonTree(data, ''), []);

console.log('json search results behavior passed');
