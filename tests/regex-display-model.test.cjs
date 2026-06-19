const assert = require('node:assert/strict');
const { parseRegexVisualization } = require('../regex-visualizer.js');
const { createRegexDisplayModel } = require('../regex-display-model.js');

function display(pattern) {
  const parsed = parseRegexVisualization(pattern);
  assert.equal(parsed.ok, true, parsed.error && parsed.error.message);
  return createRegexDisplayModel(parsed.ast);
}

function sequenceChildren(pattern) {
  return display(pattern).children[0].children;
}

const localhostNode = sequenceChildren('localhost')[0];
assert.equal(localhostNode.type, 'literalRun');
assert.equal(localhostNode.raw, 'localhost');
assert.equal(localhostNode.displayText, 'localhost');
assert.equal(localhostNode.sourceNodes.length, 9);

const escapedUrl = sequenceChildren('http:\\/\\/example\\.com')[0];
assert.equal(escapedUrl.type, 'literalRun');
assert.equal(escapedUrl.raw, 'http:\\/\\/example\\.com');
assert.equal(escapedUrl.displayText, 'http://example.com');

assert.equal(sequenceChildren('\\x2e')[0].displayText, '.');
assert.equal(sequenceChildren('\\u002e')[0].displayText, '.');
assert.equal(sequenceChildren('\\u{1F600}')[0].displayText, '😀');

const quantified = sequenceChildren('a+bc');
assert.equal(quantified[0].displayText, 'a');
assert.ok(quantified[0].quantifier);
assert.equal(quantified[1].displayText, 'bc');

const branch = display('ab|cd').children[0];
assert.deepEqual(
  branch.children.map((sequence) => sequence.children[0].displayText),
  ['ab', 'cd'],
);

assert.equal(sequenceChildren('\\d')[0].displayText, '数字');
assert.equal(sequenceChildren('\\s')[0].displayText, '空白字符');
assert.equal(sequenceChildren('\\b')[0].displayText, '单词边界');
assert.equal(sequenceChildren('a\\db').length, 3);

const characterClass = sequenceChildren('[a-zA-Z0-9-]')[0];
assert.equal(characterClass.type, 'characterClass');
assert.deepEqual(characterClass.characterItems, ['a-z', 'A-Z', '0-9', '-']);
assert.equal(characterClass.negated, false);

const negated = sequenceChildren('[^\\s-]')[0];
assert.equal(negated.negated, true);
assert.deepEqual(negated.characterItems, ['空白字符', '-']);

const escapedDash = sequenceChildren('[a\\-z]')[0];
assert.deepEqual(escapedDash.characterItems, ['a', '-', 'z']);

console.log('regex display model passed');
