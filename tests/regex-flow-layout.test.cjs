const assert = require('node:assert/strict');
const { parseRegexVisualization } = require('../regex-visualizer.js');
const { createRegexDisplayModel } = require('../regex-display-model.js');
const { layoutRegexFlow } = require('../regex-flow-layout.js');

function displayAst(pattern) {
  return createRegexDisplayModel(parseRegexVisualization(pattern).ast);
}

const parsed = parseRegexVisualization('^ab$');
assert.equal(parsed.ok, true);

const layout = layoutRegexFlow(createRegexDisplayModel(parsed.ast));
assert.equal(layout.ok, true);
assert.ok(layout.width > 0);
assert.ok(layout.height > 0);
assert.equal(layout.nodes.some((node) => node.kind === 'start'), true);
assert.equal(layout.nodes.some((node) => node.kind === 'end'), true);
assert.deepEqual(
  layout.nodes
    .filter((node) => node.kind === 'literal')
    .map((node) => node.label),
  ['ab'],
);
assert.ok(layout.nodes.every((node) => (
  Number.isFinite(node.x)
  && Number.isFinite(node.y)
  && node.width > 0
  && node.height > 0
)));
assert.ok(layout.paths.length >= 3);
assert.ok(layout.paths.every((path) => typeof path.d === 'string' && path.d.length > 0));

const branchLayout = layoutRegexFlow(displayAst('a|bc'));
assert.equal(branchLayout.ok, true);
assert.ok(branchLayout.paths.some((path) => path.kind === 'branch'));
assert.ok(branchLayout.height > layoutRegexFlow(displayAst('abc')).height);
branchLayout.paths
  .filter((path) => path.kind === 'branch')
  .forEach((path) => {
    const coordinates = [...path.d.matchAll(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g)];
    const startY = Number(coordinates[0][2]);
    const endY = Number(coordinates[coordinates.length - 1][2]);
    coordinates.forEach((coordinate) => {
      const y = Number(coordinate[2]);
      assert.ok(y >= 0);
      assert.ok(y <= branchLayout.height);
      assert.equal(y === startY || y === endY, true);
    });
  });

const optional = layoutRegexFlow(displayAst('a?'));
assert.ok(optional.paths.some((path) => path.kind === 'bypass'));

const repeated = layoutRegexFlow(displayAst('a+'));
assert.ok(repeated.paths.some((path) => path.kind === 'repeat'));
assert.equal(repeated.labels.some((label) => /至少 1 次/.test(label.text)), true);

const semanticLabels = layoutRegexFlow(
  displayAst('[0-9A-Za-z-]+\\d{2}'),
);
assert.equal(
  semanticLabels.nodes.some((node) => (
    node.lines
    && node.lines.join('|') === '0-9|A-Z|a-z|-'
  )),
  true,
);
assert.equal(semanticLabels.nodes.some((node) => node.label === '数字'), true);
assert.equal(semanticLabels.nodes.some((node) => /\+|\{2\}/.test(node.label)), false);

const exact = layoutRegexFlow(displayAst('a{3}'));
assert.equal(exact.paths.some((path) => path.kind === 'repeat'), false);
assert.equal(exact.labels.some((label) => /3 次/.test(label.text)), true);

const lazy = layoutRegexFlow(displayAst('a{2,4}?'));
assert.ok(lazy.paths.some((path) => path.kind === 'repeat'));
assert.equal(lazy.labels.some((label) => /优先少匹配/.test(label.text)), true);

const repeatedGroup = layoutRegexFlow(displayAst('(a|b)*'));
const repeatedGroupBox = repeatedGroup.groups[0];
const bypassCoordinates = [
  ...repeatedGroup.paths
    .find((path) => path.kind === 'bypass')
    .d.matchAll(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g),
].map((match) => Number(match[2]));
const repeatCoordinates = [
  ...repeatedGroup.paths
    .find((path) => path.kind === 'repeat')
    .d.matchAll(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g),
].map((match) => Number(match[2]));
assert.ok(Math.min(...bypassCoordinates) < repeatedGroupBox.y);
assert.ok(Math.max(...repeatCoordinates) > repeatedGroupBox.y + repeatedGroupBox.height);

const mixedQuantifiers = layoutRegexFlow(
  displayAst('a\\d{2}\\d{3}b'),
);
mixedQuantifiers.paths
  .filter((path) => path.kind === 'main' && /\sL/.test(path.d))
  .forEach((path) => {
    const coordinates = [...path.d.matchAll(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g)];
    assert.equal(coordinates[0][2], coordinates[1][2]);
  });

const grouped = layoutRegexFlow(
  displayAst('(?<area>((ab|cd)+))'),
);
assert.equal(grouped.ok, true);
assert.equal(grouped.groups.some((group) => group.title === '命名分组 area'), true);
assert.equal(grouped.groups.some((group) => group.kind === 'captureGroup'), true);
assert.ok(grouped.groups.length >= 2);

const asserted = layoutRegexFlow(displayAst('(?=abc)abc'));
assert.equal(asserted.groups.some((group) => group.kind === 'assertion'), true);

const empty = layoutRegexFlow(displayAst(''));
assert.equal(empty.ok, true);
assert.equal(
  empty.nodes.filter((node) => ['start', 'end'].includes(node.kind)).length,
  2,
);

const tooWide = layoutRegexFlow(
  displayAst('a'.repeat(200)),
  { maxWidth: 300 },
);
assert.equal(tooWide.ok, false);
assert.equal(tooWide.error.code, 'FLOW_TOO_LARGE');

const mergedUrl = layoutRegexFlow(displayAst('http:\\/\\/'));
assert.equal(mergedUrl.nodes.some((node) => node.label === 'http://'), true);
assert.equal(mergedUrl.nodes.filter((node) => node.kind === 'literal').length, 1);

const multiLineClass = layoutRegexFlow(displayAst('[a-zA-Z0-9-]'));
const multiLineNode = multiLineClass.nodes.find((node) => node.kind === 'character');
assert.deepEqual(multiLineNode.lines, ['a-z', 'A-Z', '0-9', '-']);
assert.ok(multiLineNode.height > 40);

const negatedClass = layoutRegexFlow(displayAst('[^\\s]*'));
const negatedClassNode = negatedClass.nodes.find((node) => node.kind === 'character');
assert.equal(negatedClassNode.negated, true);
assert.deepEqual(negatedClassNode.lines, ['排除', '空白字符']);
assert.equal(negatedClassNode.label, '排除以下字符');

console.log('regex flow layout passed');
