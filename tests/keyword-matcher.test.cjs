const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const matcher = require(path.join(root, 'keyword-matcher.js'));

assert.deepStrictEqual(matcher.parseLines('  apple  \r\n\r\n hello world \n'), ['apple', 'hello world']);
assert.deepStrictEqual(
    matcher.parseLines('Java\njava\nJAVA', { deduplicateKeywords: true, caseSensitive: false }),
    ['Java']
);
assert.deepStrictEqual(
    matcher.parseLines('Java\njava', { deduplicateKeywords: true, caseSensitive: true }),
    ['Java', 'java']
);

const basic = matcher.matchBatch(
    'apple\nJava\nPython',
    'I like apple\nJava Spring Boot\nhello world'
);
assert.deepStrictEqual(basic.stats, {
    keywordTotal: 3,
    matchedKeywords: 2,
    unmatchedKeywords: 1,
    contentTotal: 3,
    matchedContents: 2,
    unmatchedContents: 1,
});
assert.deepStrictEqual(basic.keywordResults.map(item => item.matched), [true, true, false]);
assert.deepStrictEqual(basic.contentResults.map(item => item.matched), [true, true, false]);
assert.deepStrictEqual(basic.contentResults[0].ranges, [{ start: 7, end: 12 }]);

const manyToMany = matcher.matchBatch(
    'Java\nSpring\nBoot',
    'Java developer\nJava Spring Boot\nPython developer'
);
assert.deepStrictEqual(manyToMany.keywordResults.map(item => item.contentIndexes), [[0, 1], [1], [1]]);
assert.deepStrictEqual(manyToMany.contentResults[1].keywordIndexes, [0, 1, 2]);
assert.deepStrictEqual(manyToMany.contentResults[1].ranges, [
    { start: 0, end: 4 },
    { start: 5, end: 11 },
    { start: 12, end: 16 },
]);

const caseInsensitive = matcher.matchBatch('java', 'Java\nJAVASCRIPT');
assert.strictEqual(caseInsensitive.stats.matchedContents, 2);
const caseSensitive = matcher.matchBatch('java', 'Java\njava', { caseSensitive: true });
assert.deepStrictEqual(caseSensitive.contentResults.map(item => item.matched), [false, true]);

const exact = matcher.matchBatch('Java', 'Java\nJava Spring Boot', { matchMode: 'exact' });
assert.deepStrictEqual(exact.contentResults.map(item => item.matched), [true, false]);

const special = matcher.matchBatch('a.b\n[abc]\n*\n/user?id=1', 'x a.b y\n[abc]\nvalue * ok\n/user?id=1&x=2');
assert.strictEqual(special.stats.matchedKeywords, 4);
assert.strictEqual(special.stats.matchedContents, 4);

const emptyKeyword = matcher.matchBatch('\n  \n', 'anything\nhello');
assert.strictEqual(emptyKeyword.stats.keywordTotal, 0);
assert.deepStrictEqual(emptyKeyword.contentResults.map(item => item.matched), [false, false]);

const duplicates = matcher.matchBatch('Java\nJava\nJava', 'Java');
assert.strictEqual(duplicates.stats.keywordTotal, 3);
assert.deepStrictEqual(duplicates.keywordResults.map(item => item.matched), [true, true, true]);
const deduplicated = matcher.matchBatch('Java\njava\nJava', 'JAVA', { deduplicateKeywords: true });
assert.strictEqual(deduplicated.stats.keywordTotal, 1);

assert.deepStrictEqual(
    matcher.mergeRanges([{ start: 0, end: 4 }, { start: 2, end: 7 }, { start: 8, end: 9 }]),
    [{ start: 0, end: 7 }, { start: 8, end: 9 }]
);
assert.match(matcher.formatResults(basic), /已匹配\tapple\t命中内容 1 条/);
assert.match(matcher.buildCsv(basic), /^\uFEFF"类型","序号","状态","文本","匹配数量"/);

const page = fs.readFileSync(path.join(root, 'keyword-matcher.html'), 'utf8');
assert.match(page, /<title>关键词批量匹配工具<\/title>/);
assert.match(page, /<script src="nav\.js" defer><\/script>/);
assert.match(page, /<script src="keyword-matcher\.js"><\/script>/);
assert.match(page, /id="keywordInput"/);
assert.match(page, /id="contentInput"/);
assert.match(page, /id="matchBtn"/);
assert.match(page, /id="clearBtn"/);
assert.match(page, /id="caseSensitive"/);
assert.match(page, /id="matchMode"/);
assert.match(page, /id="deduplicateKeywords"/);
assert.match(page, /id="keywordResults"/);
assert.match(page, /id="contentResults"/);
assert.match(page, /function renderHighlightedText/);
assert.match(page, /document\.createElement\('mark'\)/);
assert.match(page, /--page-text-primary:\s*#1f2328/);
assert.match(page, /--page-text-secondary:\s*#57606a/);
assert.doesNotMatch(page, /--text-primary\s*:/);
assert.doesNotMatch(page, /--text-secondary\s*:/);
assert.doesNotMatch(page, /var\(--text-primary\)/);
assert.doesNotMatch(page, /var\(--text-secondary\)/);
assert.match(page, /const DEFAULT_KEYWORD_SAMPLE = 'apple\\nJava\\nPython/);
assert.match(page, /const DEFAULT_CONTENT_SAMPLE = 'I like apple\\nJava Spring Boot/);
assert.match(page, /function fillSampleInputs\(\)/);
assert.match(page, /if \(keywordCount === 0 && contentCount === 0\) \{\s*fillSampleInputs\(\);/);
assert.match(page, /function loadSample\(\) \{\s*fillSampleInputs\(\);\s*runMatch\(\);/);
assert.match(page, /<span>V1\.02<\/span>/);
assert.match(page, /<div class="changelog-date">2026年9月20日<\/div>[\s\S]*?<div class="changelog-version">V1\.02<\/div>/);
assert.match(page, /<div class="changelog-date">2026年9月20日<\/div>[\s\S]*?<div class="changelog-version">V1\.01<\/div>/);
assert.match(page, /<div class="changelog-date">2026年9月19日<\/div>[\s\S]*?<div class="changelog-version">V1\.00<\/div>/);
for (const match of page.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g)) {
    new vm.Script(match[1]);
}

console.log('keyword matcher behavior and integration passed');
