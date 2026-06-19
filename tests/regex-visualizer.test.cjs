const assert = require('node:assert/strict');
const regexVisualizer = require('../regex-visualizer.js');
const {
  parseRegexVisualization,
} = regexVisualizer;

assert.equal(Object.hasOwn(regexVisualizer, 'RegexParser'), false);

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

const quantifiedBranch = parseRegexVisualization('(?:ab|cd)+?e*f?g{2}h{3,}i{4,6}?');
assert.equal(quantifiedBranch.ok, true);
const quantifiedNodes = quantifiedBranch.ast.children[0].children;
assert.equal(quantifiedNodes[0].type, 'group');
assert.equal(quantifiedNodes[0].children[0].type, 'alternation');
assert.deepEqual(quantifiedNodes[0].quantifier, {
  min: 1,
  max: Infinity,
  greedy: false,
  raw: '+?',
});
assert.deepEqual(quantifiedNodes[1].quantifier, {
  min: 0,
  max: Infinity,
  greedy: true,
  raw: '*',
});
assert.deepEqual(quantifiedNodes[2].quantifier, {
  min: 0,
  max: 1,
  greedy: true,
  raw: '?',
});
assert.deepEqual(quantifiedNodes[3].quantifier, {
  min: 2,
  max: 2,
  greedy: true,
  raw: '{2}',
});
assert.deepEqual(quantifiedNodes[4].quantifier, {
  min: 3,
  max: Infinity,
  greedy: true,
  raw: '{3,}',
});
assert.deepEqual(quantifiedNodes[5].quantifier, {
  min: 4,
  max: 6,
  greedy: false,
  raw: '{4,6}?',
});

const groups = parseRegexVisualization(
  '(a)(?:b)(?=c)(?!d)(?<=e)(?<!f)(?<name>g)',
);
assert.equal(groups.ok, true);
assert.equal(groups.captureGroupCount, 2);
const groupNodes = groups.ast.children[0].children;
assert.equal(groupNodes[0].groupKind, 'capturing');
assert.equal(groupNodes[0].groupNumber, 1);
assert.equal(groupNodes[1].groupKind, 'nonCapturing');
assert.equal(groupNodes[2].groupKind, 'positiveLookahead');
assert.equal(groupNodes[3].groupKind, 'negativeLookahead');
assert.equal(groupNodes[4].groupKind, 'positiveLookbehind');
assert.equal(groupNodes[5].groupKind, 'negativeLookbehind');
assert.equal(groupNodes[6].groupKind, 'namedCapturing');
assert.equal(groupNodes[6].groupNumber, 2);
assert.equal(groupNodes[6].groupName, 'name');

const tokens = parseRegexVisualization(
  '[a-z][^0-9].\\d\\w\\s\\b(a)\\1(?<word>b)\\k<word>',
);
assert.equal(tokens.ok, true);
const tokenNodes = tokens.ast.children[0].children;
assert.equal(tokenNodes[0].type, 'characterClass');
assert.equal(tokenNodes[0].negated, false);
assert.equal(tokenNodes[1].type, 'characterClass');
assert.equal(tokenNodes[1].negated, true);
assert.equal(tokenNodes[2].type, 'wildcard');
assert.deepEqual(
  tokenNodes.slice(3, 7).map((node) => node.escapeKind),
  ['digit', 'word', 'whitespace', 'wordBoundary'],
);
assert.equal(tokenNodes[8].type, 'backreference');
assert.equal(tokenNodes[8].referenceNumber, 1);
assert.equal(tokenNodes[10].type, 'backreference');
assert.equal(tokenNodes[10].referenceName, 'word');

const forwardNumericReference = parseRegexVisualization('\\1(a)');
assert.equal(forwardNumericReference.ok, true);
assert.equal(
  forwardNumericReference.ast.children[0].children[0].type,
  'backreference',
);
assert.equal(
  forwardNumericReference.ast.children[0].children[0].referenceNumber,
  1,
);

for (const source of ['\\1', '\\123', '\\8']) {
  const legacyNumericEscape = parseRegexVisualization(source);
  assert.equal(legacyNumericEscape.ok, true);
  const legacyNode = legacyNumericEscape.ast.children[0].children[0];
  assert.notEqual(legacyNode.type, 'backreference');
  assert.match(legacyNode.description, /legacy|octal|identity/i);
}

const nonCapturingMetadata = parseRegexVisualization(
  '(?:a)(?=b)(?!c)(?<=d)(?<!e)\\1',
);
assert.equal(nonCapturingMetadata.ok, true);
assert.equal(nonCapturingMetadata.captureGroupCount, 0);
assert.equal(
  nonCapturingMetadata.ast.children[0].children[5].type,
  'legacyEscape',
);

const legacyNamedEscape = parseRegexVisualization('\\k<x>');
assert.equal(legacyNamedEscape.ok, true);
const legacyNamedNode = legacyNamedEscape.ast.children[0].children[0];
assert.notEqual(legacyNamedNode.type, 'backreference');
assert.match(legacyNamedNode.description, /legacy|identity/i);

const legacyNamedQuantifier = parseRegexVisualization('\\k<x>*');
assert.equal(legacyNamedQuantifier.ok, true);
const legacyNamedSequence = legacyNamedQuantifier.ast.children[0];
assert.deepEqual(
  legacyNamedSequence.children.map((node) => node.raw),
  ['\\k', '<', 'x', '>*'],
);
assert.equal(legacyNamedSequence.children[0].type, 'legacyEscape');
assert.equal(legacyNamedSequence.children[3].type, 'literal');
assert.deepEqual(legacyNamedSequence.children[3].quantifier, {
  min: 0,
  max: Infinity,
  greedy: true,
  raw: '*',
});

const forwardNamedReference = parseRegexVisualization(
  '\\k<x>(?<x>a)',
);
assert.equal(forwardNamedReference.ok, true);
assert.equal(
  forwardNamedReference.ast.children[0].children[0].type,
  'backreference',
);
assert.equal(
  forwardNamedReference.ast.children[0].children[0].referenceName,
  'x',
);

const unicodeNamedGroup = parseRegexVisualization('(?<名>a)\\k<名>', 'u');
assert.equal(unicodeNamedGroup.ok, true);
assert.equal(unicodeNamedGroup.captureGroupCount, 1);
const unicodeNamedNodes = unicodeNamedGroup.ast.children[0].children;
assert.equal(unicodeNamedNodes[0].groupName, '名');
assert.equal(unicodeNamedNodes[1].referenceName, '名');

const escapedNamedGroup = parseRegexVisualization(
  String.raw`(?<\u0061>a)\k<a>`,
  'u',
);
assert.equal(escapedNamedGroup.ok, true);
const escapedNamedNodes = escapedNamedGroup.ast.children[0].children;
assert.equal(escapedNamedNodes[0].groupName, 'a');
assert.equal(escapedNamedNodes[1].referenceName, 'a');

const escapedNamedReference = parseRegexVisualization(
  String.raw`(?<a>a)\k<\u0061>`,
  'u',
);
assert.equal(escapedNamedReference.ok, true);
assert.equal(
  escapedNamedReference.ast.children[0].children[1].referenceName,
  'a',
);

const invalidNamedGroups = [
  parseRegexVisualization('(?<x>a)\\k<>'),
  parseRegexVisualization('(?<x>a)\\k<missing>'),
  parseRegexVisualization('(?<x>a)(?<x>b)'),
];
assert.deepEqual(
  invalidNamedGroups.map((result) => result.ok),
  [false, false, false],
);
for (const invalidNamedGroup of invalidNamedGroups) {
  assert.equal(typeof invalidNamedGroup.error.index, 'number');
  assert.match(invalidNamedGroup.error.message, /name|named/i);
}

const inlineFlags = parseRegexVisualization(
  '(?i)Call to address=(.+?) failed',
  'gmm',
);
assert.equal(inlineFlags.ok, true);
assert.equal(inlineFlags.originalSource, '(?i)Call to address=(.+?) failed');
assert.equal(inlineFlags.source, 'Call to address=(.+?) failed');
assert.equal(inlineFlags.flags, 'gim');

const mappedInlineError = parseRegexVisualization('(?i)(abc', 'g');
assert.equal(mappedInlineError.ok, false);
assert.equal(mappedInlineError.error.index, 4);
assert.equal(mappedInlineError.originalSource, '(?i)(abc');

for (const invalidInline of ['a(?i)b', '(?i:a)', '(?m)a']) {
  const invalid = parseRegexVisualization(invalidInline);
  assert.equal(invalid.ok, false);
}

for (const [source, flags] of [
  ['a', 'z'],
  ['a', 'uv'],
  ['(a)\\2', 'u'],
]) {
  const invalidNativeSyntax = parseRegexVisualization(source, flags);
  assert.equal(invalidNativeSyntax.ok, false);
  assert.equal(typeof invalidNativeSyntax.error.message, 'string');
  assert.equal(invalidNativeSyntax.error.message.length > 0, true);
  assert.equal(typeof invalidNativeSyntax.error.index, 'number');
}

const unicodeBackreferenceError = parseRegexVisualization('(a)\\2', 'u');
assert.equal(unicodeBackreferenceError.ok, false);
assert.equal(unicodeBackreferenceError.error.index, 3);

const mappedUnicodeBackreferenceError = parseRegexVisualization(
  '(?i)(a)\\2',
  'u',
);
assert.equal(mappedUnicodeBackreferenceError.ok, false);
assert.equal(mappedUnicodeBackreferenceError.error.index, 7);

for (const [source, expectedIndex] of [
  ['a\\q', 1],
  ['[a\\q]', 2],
  ['(?i)a\\q', 5],
]) {
  const invalidIdentityEscape = parseRegexVisualization(source, 'u');
  assert.equal(invalidIdentityEscape.ok, false);
  assert.equal(invalidIdentityEscape.error.index, expectedIndex);
}

for (const source of ['(?=a)*', 'a{', 'a{}']) {
  const annexB = parseRegexVisualization(source);
  assert.equal(annexB.ok, true, source);

  for (const flags of ['u', 'v']) {
    const strictUnicode = parseRegexVisualization(source, flags);
    assert.equal(strictUnicode.ok, false, source + '/' + flags);
  }
}
for (const source of ['a{', 'a{}']) {
  const annexBSequence = parseRegexVisualization(source)
    .ast.children[0];
  assert.equal(annexBSequence.children[1].type, 'literal');
  assert.equal(annexBSequence.children[1].raw, '{');
}

for (const quantifierRaw of [
  '{9007199254740992}',
  '{1,9007199254740992}',
  '{9007199254740992}?',
]) {
  const unsafeQuantifier = parseRegexVisualization(
    'a' + quantifierRaw,
  );
  assert.equal(unsafeQuantifier.ok, false);
  assert.match(unsafeQuantifier.error.message, /safe integer|quantifier/i);
  assert.equal(
    unsafeQuantifier.error.details.quantifierRaw,
    quantifierRaw,
  );
}

const tooLong = parseRegexVisualization('abc', '', { maxLength: 2 });
assert.equal(tooLong.ok, false);
assert.equal(tooLong.error.index, 2);
assert.equal(tooLong.error.details.limitType, 'maxLength');

const tooManyNodes = parseRegexVisualization('abc', '', { maxNodes: 2 });
assert.equal(tooManyNodes.ok, false);
assert.match(tooManyNodes.error.message, /node/i);
assert.equal(tooManyNodes.error.details.limitType, 'maxNodes');

const tooDeep = parseRegexVisualization('((a))', '', { maxDepth: 1 });
assert.equal(tooDeep.ok, false);
assert.match(tooDeep.error.message, /depth|嵌套/i);
assert.equal(tooDeep.error.index, 1);
assert.equal(tooDeep.error.details.limitType, 'maxDepth');

const hardDepthLimit = parseRegexVisualization(
  '('.repeat(81) + 'a' + ')'.repeat(81),
  '',
  { maxDepth: 2000 },
);
assert.equal(hardDepthLimit.ok, false);
assert.equal(hardDepthLimit.error.details.limitType, 'maxDepth');
assert.equal(hardDepthLimit.error.details.limit, 80);

const invalidLimitValues = [NaN, Infinity, 0, -1, '1'];
const defaultLimitCases = [
  {
    name: 'maxLength',
    source: 'a'.repeat(4001),
    expectedLimit: 4000,
  },
  {
    name: 'maxNodes',
    source: 'a'.repeat(1201),
    expectedLimit: 1200,
  },
  {
    name: 'maxDepth',
    source: '('.repeat(81) + 'a' + ')'.repeat(81),
    expectedLimit: 80,
  },
];
for (const limitCase of defaultLimitCases) {
  for (const invalidValue of invalidLimitValues) {
    const limited = parseRegexVisualization('', '', {
      [limitCase.name]: invalidValue,
    });
    assert.equal(limited.ok, true);

    const exceeded = parseRegexVisualization(limitCase.source, '', {
      [limitCase.name]: invalidValue,
    });
    assert.equal(exceeded.ok, false);
    assert.equal(exceeded.error.details.limitType, limitCase.name);
    assert.equal(exceeded.error.details.limit, limitCase.expectedLimit);
  }
}

function assertNodeContract(node, source) {
  for (const field of [
    'type',
    'raw',
    'start',
    'end',
    'description',
    'children',
  ]) {
    assert.equal(Object.hasOwn(node, field), true);
  }
  assert.equal(node.raw, source.slice(node.start, node.end));
  assert.equal(Array.isArray(node.children), true);
  for (const child of node.children) {
    assertNodeContract(child, source);
  }
}

assertNodeContract(quantifiedBranch.ast, quantifiedBranch.source);
assertNodeContract(tokens.ast, tokens.source);

for (const [source, expectedIndex] of [
  ['a(b', 1],
  ['a[b', 1],
  ['a\\', 1],
  ['*a', 0],
  ['a++', 2],
  ['a{3,2}', 1],
  ['a{2}{3}', 4],
  ['^+', 1],
  ['\\b*', 2],
  ['(?<=a)*', 6],
]) {
  const invalid = parseRegexVisualization(source);
  assert.equal(invalid.ok, false);
  assert.equal(invalid.error.index, expectedIndex);
}

console.log('regex visualizer parser passed');
