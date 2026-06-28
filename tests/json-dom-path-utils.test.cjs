const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const utils = require(path.resolve(__dirname, '../json-dom-path-utils.js'));

assert.deepStrictEqual(utils.parseNodePath({ dataset: { path: '["items",0,"name"]' } }), ['items', 0, 'name']);
assert.strictEqual(utils.parseNodePath({ dataset: { path: '{"not":"array"}' } }), null);
assert.strictEqual(utils.parseNodePath({ dataset: { path: '[' } }), null);
assert.strictEqual(utils.parseNodePath(null), null);

assert.strictEqual(utils.isPathPrefix(['items'], ['items', 0, 'name']), true);
assert.strictEqual(utils.isPathPrefix(['items', 1], ['items', 0, 'name']), false);
assert.strictEqual(utils.isPathPrefix(['items', 0, 'name', 'extra'], ['items', 0, 'name']), false);

const page = fs.readFileSync(path.resolve(__dirname, '../json-parser.html'), 'utf8');
assert.match(page, /<script src="json-dom-path-utils\.js"><\/script>/);
assert.match(page, /JsonDomPathUtils\.parseNodePath\(container\)/);
assert.match(page, /JsonDomPathUtils\.isPathPrefix\(basePath, nodePath\)/);
assert.doesNotMatch(page, /function parseNodePath\(node\)/);
assert.doesNotMatch(page, /function isPathPrefix\(prefix, path\)/);

console.log('json dom path utils behavior and integration passed');
