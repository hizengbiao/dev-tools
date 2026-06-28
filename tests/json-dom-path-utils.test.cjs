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

const rootNode = {
    parentElement: null,
};
const childNode = {
    parentElement: {
        closest(selector) {
            assert.strictEqual(selector, '.json-node');
            return rootNode;
        },
    },
};
const grandChildNode = {
    parentElement: {
        closest(selector) {
            assert.strictEqual(selector, '.json-node');
            return childNode;
        },
    },
};
const detachedNode = {
    parentElement: {
        closest() {
            return null;
        },
    },
};

assert.strictEqual(utils.getRelativeNodeDepthFromDom(rootNode, rootNode), 0);
assert.strictEqual(utils.getRelativeNodeDepthFromDom(rootNode, childNode), 1);
assert.strictEqual(utils.getRelativeNodeDepthFromDom(rootNode, grandChildNode), 2);
assert.strictEqual(utils.getRelativeNodeDepthFromDom(rootNode, detachedNode), -1);

const ownIcon = { name: 'own' };
const nestedIcon = { name: 'nested' };
const nodeWithOwnIcon = {
    children: [{
        classList: {
            contains(className) {
                return className === 'json-row';
            },
        },
        querySelector(selector) {
            assert.strictEqual(selector, '.collapsible-icon');
            return ownIcon;
        },
    }],
    querySelector() {
        return nestedIcon;
    },
};
const nodeWithoutRow = {
    children: [],
    querySelector(selector) {
        assert.strictEqual(selector, '.collapsible-icon');
        return nestedIcon;
    },
};

assert.strictEqual(utils.getOwnCollapsibleIcon(nodeWithOwnIcon), ownIcon);
assert.strictEqual(utils.getOwnCollapsibleIcon(nodeWithoutRow), nestedIcon);
assert.strictEqual(utils.getOwnCollapsibleIcon(null), null);

const page = fs.readFileSync(path.resolve(__dirname, '../json-parser.html'), 'utf8');
assert.match(page, /<script src="json-dom-path-utils\.js"><\/script>/);
assert.match(page, /JsonDomPathUtils\.parseNodePath\(container\)/);
assert.match(page, /JsonDomPathUtils\.isPathPrefix\(basePath, nodePath\)/);
assert.match(page, /JsonDomPathUtils\.getRelativeNodeDepthFromDom\(container, node\)/);
assert.match(page, /JsonDomPathUtils\.getOwnCollapsibleIcon\(node\)/);
assert.doesNotMatch(page, /function parseNodePath\(node\)/);
assert.doesNotMatch(page, /function isPathPrefix\(prefix, path\)/);
assert.doesNotMatch(page, /function getRelativeNodeDepthFromDom\(container, node\)/);
assert.doesNotMatch(page, /function getOwnCollapsibleIcon\(node\)/);

console.log('json dom path utils behavior and integration passed');
