const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const utils = require(path.resolve(__dirname, '../regex-runtime-utils.js'));

assert.deepStrictEqual(
    utils.parseInlineFlags('(?i)Call to address=(.+?) failed', 'gm'),
    { source: 'Call to address=(.+?) failed', flags: 'gim' }
);
assert.deepStrictEqual(
    utils.parseInlineFlags('(?su).+', 'g'),
    { source: '.+', flags: 'gsu' }
);
assert.deepStrictEqual(
    utils.parseInlineFlags('plain', 'gm'),
    { source: 'plain', flags: 'gm' }
);

assert.strictEqual(utils.normalizeEscapedRegexPattern(String.raw`jdbc:mysql://[^,\\s]+`), String.raw`jdbc:mysql://[^,\s]+`);
assert.strictEqual(utils.normalizeEscapedRegexPattern(String.raw`\\d{3}-\\d{4}`), String.raw`\d{3}-\d{4}`);

const ordered = utils.getRegexWithFlags('a', 'miggm');
assert.strictEqual(ordered.flags, 'gim');
assert.ok(ordered.test('A'));

assert.deepStrictEqual(utils.getLineColumn('alpha\nbeta\ngamma', 0), { line: 1, column: 1 });
assert.deepStrictEqual(utils.getLineColumn('alpha\nbeta\ngamma', 6), { line: 2, column: 1 });
assert.deepStrictEqual(utils.getLineColumn('alpha\nbeta\ngamma', 10), { line: 2, column: 5 });

assert.strictEqual(utils.getCaptureGroupCount('(a)(?:b)(?<name>c)(?=d)[(e)]'), 2);
assert.deepStrictEqual(utils.getMissingReplacementGroups('$1-$3-$0-$$4', '(a)(b)'), ['$3']);
assert.deepStrictEqual(utils.getMissingReplacementGroups('$1***$2', '^(1[3-9]\\d{2})\\d{3}(\\d{4})$'), []);

const page = fs.readFileSync(path.resolve(__dirname, '../regex-tester.html'), 'utf8');
assert.match(page, /<script src="regex-runtime-utils\.js"><\/script>/);
assert.match(page, /RegexRuntimeUtils\.parseInlineFlags\(/);
assert.match(page, /RegexRuntimeUtils\.normalizeEscapedRegexPattern\(/);
assert.match(page, /RegexRuntimeUtils\.getRegexWithFlags\(/);
assert.match(page, /RegexRuntimeUtils\.getLineColumn\(/);
assert.match(page, /RegexRuntimeUtils\.getMissingReplacementGroups\(/);
assert.doesNotMatch(page, /function parseInlineFlags\(pattern, selectedFlags\)/);
assert.doesNotMatch(page, /function normalizeEscapedRegexPattern\(pattern\)/);
assert.doesNotMatch(page, /function getLineColumn\(text, index\)/);
assert.doesNotMatch(page, /function getCaptureGroupCount\(pattern\)/);
assert.doesNotMatch(page, /function getMissingReplacementGroups\(replacement, pattern\)/);

console.log('regex runtime utilities passed');
