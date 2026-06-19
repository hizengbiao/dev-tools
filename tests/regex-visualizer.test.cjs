const assert = require('node:assert/strict');
const {
  parseRegexVisualization,
} = require('../regex-visualizer.js');

const result = parseRegexVisualization(
  '^(1[3-9]\\d{2})\\d{3}(\\d{4})$',
  'gm',
);

assert.equal(result.ok, true);
assert.equal(result.ast.type, 'expression');
assert.equal(result.flags, 'gm');
assert.equal(result.ast.children[0].type, 'sequence');
assert.equal(result.captureGroupCount, 2);

const sequence = result.ast.children[0];
assert.equal(result.ast.raw, '^(1[3-9]\\d{2})\\d{3}(\\d{4})$');
assert.equal(result.ast.start, 0);
assert.equal(result.ast.end, 27);
assert.equal(result.ast.children.length, 1);
assert.equal(sequence.raw, '^(1[3-9]\\d{2})\\d{3}(\\d{4})$');
assert.equal(sequence.start, 0);
assert.equal(sequence.end, 27);
assert.equal(sequence.children[0].raw, '^');
assert.equal(sequence.children[0].start, 0);
assert.equal(sequence.children[0].end, 1);
assert.deepEqual(sequence.children[0].children, []);
assert.equal(sequence.children[1].raw, '(1[3-9]\\d{2})');
assert.equal(sequence.children[1].start, 1);
assert.equal(sequence.children[1].end, 14);
assert.equal(sequence.children[1].children.length, 1);

const nested = parseRegexVisualization('(a(b)c)');
assert.equal(nested.ok, true);
const outerGroup = nested.ast.children[0].children[0];
const innerGroup = outerGroup.children[0].children[1];
assert.equal(outerGroup.description, 'Capturing group 1');
assert.equal(innerGroup.description, 'Capturing group 2');

for (const [source, expectedIndex] of [
  ['a(b', 1],
  ['a[b', 1],
  ['a\\', 1],
]) {
  const invalid = parseRegexVisualization(source);
  assert.equal(invalid.ok, false);
  assert.equal(invalid.error.index, expectedIndex);
}

console.log('regex visualizer parser passed');
