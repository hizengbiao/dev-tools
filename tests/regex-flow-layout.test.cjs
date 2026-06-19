const assert = require('node:assert/strict');
const { parseRegexVisualization } = require('../regex-visualizer.js');
const { layoutRegexFlow } = require('../regex-flow-layout.js');

const parsed = parseRegexVisualization('^ab$');
assert.equal(parsed.ok, true);

const layout = layoutRegexFlow(parsed.ast);
assert.equal(layout.ok, true);
assert.ok(layout.width > 0);
assert.ok(layout.height > 0);
assert.equal(layout.nodes.some((node) => node.kind === 'start'), true);
assert.equal(layout.nodes.some((node) => node.kind === 'end'), true);
assert.deepEqual(
  layout.nodes
    .filter((node) => node.kind === 'literal')
    .map((node) => node.raw),
  ['a', 'b'],
);
assert.ok(layout.nodes.every((node) => (
  Number.isFinite(node.x)
  && Number.isFinite(node.y)
  && node.width > 0
  && node.height > 0
)));
assert.ok(layout.paths.length >= 3);
assert.ok(layout.paths.every((path) => typeof path.d === 'string' && path.d.length > 0));

const branchLayout = layoutRegexFlow(parseRegexVisualization('a|bc').ast);
assert.equal(branchLayout.ok, true);
assert.ok(branchLayout.paths.some((path) => path.kind === 'branch'));
assert.ok(branchLayout.height > layoutRegexFlow(parseRegexVisualization('abc').ast).height);
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

const optional = layoutRegexFlow(parseRegexVisualization('a?').ast);
assert.ok(optional.paths.some((path) => path.kind === 'bypass'));

const repeated = layoutRegexFlow(parseRegexVisualization('a+').ast);
assert.ok(repeated.paths.some((path) => path.kind === 'repeat'));
assert.equal(repeated.labels.some((label) => /至少 1 次/.test(label.text)), true);

const semanticLabels = layoutRegexFlow(
  parseRegexVisualization('[0-9A-Za-z-]+\\d{2}').ast,
);
assert.equal(semanticLabels.nodes.some((node) => node.label === '0-9A-Za-z-'), true);
assert.equal(semanticLabels.nodes.some((node) => node.label === '数字'), true);
assert.equal(semanticLabels.nodes.some((node) => /\+|\{2\}/.test(node.label)), false);

const exact = layoutRegexFlow(parseRegexVisualization('a{3}').ast);
assert.equal(exact.paths.some((path) => path.kind === 'repeat'), false);
assert.equal(exact.labels.some((label) => /3 次/.test(label.text)), true);

const lazy = layoutRegexFlow(parseRegexVisualization('a{2,4}?').ast);
assert.ok(lazy.paths.some((path) => path.kind === 'repeat'));
assert.equal(lazy.labels.some((label) => /优先少匹配/.test(label.text)), true);

const repeatedGroup = layoutRegexFlow(parseRegexVisualization('(a|b)*').ast);
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
  parseRegexVisualization('a\\d{2}\\d{3}b').ast,
);
mixedQuantifiers.paths
  .filter((path) => path.kind === 'main' && /\sL/.test(path.d))
  .forEach((path) => {
    const coordinates = [...path.d.matchAll(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g)];
    assert.equal(coordinates[0][2], coordinates[1][2]);
  });

const grouped = layoutRegexFlow(
  parseRegexVisualization('(?<area>((ab|cd)+))').ast,
);
assert.equal(grouped.ok, true);
assert.equal(grouped.groups.some((group) => group.title === '命名分组 area'), true);
assert.equal(grouped.groups.some((group) => group.kind === 'captureGroup'), true);
assert.ok(grouped.groups.length >= 2);

const asserted = layoutRegexFlow(parseRegexVisualization('(?=abc)abc').ast);
assert.equal(asserted.groups.some((group) => group.kind === 'assertion'), true);

const empty = layoutRegexFlow(parseRegexVisualization('').ast);
assert.equal(empty.ok, true);
assert.equal(
  empty.nodes.filter((node) => ['start', 'end'].includes(node.kind)).length,
  2,
);

const tooWide = layoutRegexFlow(
  parseRegexVisualization('a'.repeat(200)).ast,
  { maxWidth: 300 },
);
assert.equal(tooWide.ok, false);
assert.equal(tooWide.error.code, 'FLOW_TOO_LARGE');

console.log('regex flow layout passed');
