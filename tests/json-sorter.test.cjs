const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const sorter = require(path.resolve(__dirname, '../json-sorter.js'));

const source = {
    zebra: 1,
    alpha: {
        delta: 4,
        beta: 2,
        gamma: [{ z: 26, a: 1 }],
    },
    middle: null,
};

const asc = sorter.sortObjectKeys(source, true);
assert.deepStrictEqual(Object.keys(asc), ['alpha', 'middle', 'zebra']);
assert.deepStrictEqual(Object.keys(asc.alpha), ['beta', 'delta', 'gamma']);
assert.deepStrictEqual(Object.keys(asc.alpha.gamma[0]), ['a', 'z']);

const desc = sorter.sortObjectKeys(source, false);
assert.deepStrictEqual(Object.keys(desc), ['zebra', 'middle', 'alpha']);
assert.deepStrictEqual(Object.keys(desc.alpha), ['gamma', 'delta', 'beta']);
assert.deepStrictEqual(Object.keys(desc.alpha.gamma[0]), ['z', 'a']);

assert.deepStrictEqual(sorter.sortObjectKeys([source], true).map(Object.keys), [['alpha', 'middle', 'zebra']]);
assert.strictEqual(sorter.sortObjectKeys('text', true), 'text');
assert.strictEqual(sorter.sortObjectKeys(null, true), null);
assert.notStrictEqual(asc, source);
assert.deepStrictEqual(Object.keys(source), ['zebra', 'alpha', 'middle']);

const page = fs.readFileSync(path.resolve(__dirname, '../json-parser.html'), 'utf8');
assert.match(page, /<script src="json-sorter\.js"><\/script>/);
assert.match(page, /JsonSorter\.sortObjectKeys\(currentObj, asc\)/);
assert.doesNotMatch(page, /function sortObject\(obj, asc\)/);

console.log('json sorter behavior and integration passed');
