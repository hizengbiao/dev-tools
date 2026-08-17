const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const masker = require(path.resolve(__dirname, '../text-masker.js'));

const mappings = [
    { plain: 'prod-db.example.com', masked: 'DB_HOST' },
    { plain: 'prod-db', masked: 'DB' },
    { plain: 'admin', masked: 'USER' },
];

assert.strictEqual(
    masker.maskText('admin@prod-db.example.com and prod-db.example.com', mappings),
    'USER@DB_HOST and DB_HOST'
);
assert.strictEqual(
    masker.unmaskText('USER@DB_HOST and DB_HOST', mappings),
    'admin@prod-db.example.com and prod-db.example.com'
);

assert.strictEqual(
    masker.maskText('alpha', [
        { plain: 'alpha', masked: 'beta' },
        { plain: 'beta', masked: 'gamma' },
    ]),
    'beta',
    'inserted replacement text must not be replaced again'
);

assert.deepStrictEqual(
    masker.validateMappings([
        { plain: '  secret  ', masked: '  MASKED  ' },
        { plain: '', masked: '' },
    ]),
    [{ type: 'literal', plain: '  secret  ', masked: '  MASKED  ', flags: '' }]
);
assert.throws(
    () => masker.validateMappings([{ plain: 'secret', masked: '' }]),
    (error) => error.code === 'INCOMPLETE_MAPPING'
);
assert.throws(
    () => masker.validateMappings([
        { plain: 'secret', masked: 'ONE' },
        { plain: 'secret', masked: 'TWO' },
    ]),
    (error) => error.code === 'DUPLICATE_PLAIN'
);
assert.throws(
    () => masker.validateMappings([
        { plain: 'one', masked: 'MASK' },
        { plain: 'two', masked: 'MASK' },
    ]),
    (error) => error.code === 'DUPLICATE_MASKED'
);

const ipv4Pattern = String.raw`\b(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)\.(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)\.(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)\.(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)\b`;
const ipv4Mapping = { type: 'regex', plain: ipv4Pattern, masked: '[IP]', flags: '' };
assert.strictEqual(
    masker.maskText('来源 0.0.0.0、192.168.1.25、255.255.255.255\n保留 256.1.1.1 和 999.1.1.1', [ipv4Mapping]),
    '来源 [IP]、[IP]、[IP]\n保留 256.1.1.1 和 999.1.1.1'
);
assert.strictEqual(
    masker.maskText('Call 138-0013 or 021-7788', [{
        type: 'regex',
        plain: String.raw`(?<area>\d{3})-(\d{4})`,
        masked: '$<area>-***-$2',
        flags: '',
    }]),
    'Call 138-***-0013 or 021-***-7788'
);
assert.strictEqual(
    masker.maskText('foo', [{ type: 'regex', plain: 'foo', masked: '[$&]$$', flags: '' }]),
    '[foo]$'
);
assert.strictEqual(
    masker.maskText('alpha ALPHA Alpha', [{ type: 'regex', plain: 'alpha', masked: 'X', flags: 'ig' }]),
    'X X X'
);
assert.strictEqual(masker.normalizeRegexFlags('gmsui', 0), 'imsu');

assert.strictEqual(
    masker.maskText('foo bar', [
        { type: 'regex', plain: 'foo', masked: 'bar', flags: '' },
        { type: 'literal', plain: 'bar', masked: 'baz' },
    ]),
    'bar baz',
    'regex replacements must not cascade into literal mappings'
);
assert.strictEqual(
    masker.maskText('abc', [
        { type: 'regex', plain: 'ab', masked: 'REGEX', flags: '' },
        { type: 'literal', plain: 'abc', masked: 'LONGER' },
    ]),
    'LONGER',
    'the longest match at the same position must win'
);
assert.strictEqual(
    masker.maskText('zabc', [
        { type: 'regex', plain: 'abc', masked: 'REGEX', flags: '' },
        { type: 'literal', plain: 'za', masked: 'EARLIER' },
    ]),
    'EARLIERbc',
    'the earliest match must win before considering match length'
);

const mixedMappings = [
    { type: 'literal', plain: 'admin', masked: 'USER' },
    { type: 'regex', plain: String.raw`\d+`, masked: '[NUMBER]', flags: '' },
];
assert.strictEqual(masker.unmaskText('USER [NUMBER]', mixedMappings), 'admin [NUMBER]');
assert.strictEqual(masker.maskText('admin 123', mixedMappings), 'USER [NUMBER]');

assert.throws(
    () => masker.validateMappings([{ type: 'regex', plain: '(', masked: '[X]', flags: '' }]),
    (error) => error.code === 'INVALID_REGEX'
);
assert.throws(
    () => masker.validateMappings([{ type: 'regex', plain: 'a', masked: '[X]', flags: 'z' }]),
    (error) => error.code === 'INVALID_REGEX_FLAGS'
);
assert.throws(
    () => masker.validateMappings([{ type: 'regex', plain: 'a', masked: '[X]', flags: 'ii' }]),
    (error) => error.code === 'DUPLICATE_REGEX_FLAG'
);
for (const pattern of ['^', 'a*', String.raw`\b`, '(?=IP)', String.raw`(?=\x41)`, '(?<=A)']) {
    assert.throws(
        () => masker.validateMappings([{ type: 'regex', plain: pattern, masked: '[X]', flags: '' }]),
        (error) => error.code === 'EMPTY_REGEX_MATCH',
        `${pattern} should be rejected because it can produce an empty match`
    );
}
for (const pattern of ['^foo$', String.raw`\bfoo\b`, '(?=foo)foo', '(?<=A)B', '(?:a?b)']) {
    assert.doesNotThrow(
        () => masker.validateMappings([{ type: 'regex', plain: pattern, masked: '[X]', flags: '' }]),
        `${pattern} consumes text and should remain valid`
    );
}
assert.doesNotThrow(() => masker.validateMappings([
    { type: 'regex', plain: '(a+)+$', masked: '[X]', flags: '' },
]));
assert.throws(
    () => masker.validateMappings([
        { type: 'regex', plain: 'foo', masked: '[X]', flags: 'i' },
        { type: 'regex', plain: 'foo', masked: '[Y]', flags: 'gi' },
    ]),
    (error) => error.code === 'DUPLICATE_REGEX'
);
assert.doesNotThrow(() => masker.validateMappings([
    { type: 'regex', plain: 'foo', masked: '[X]', flags: '' },
    { type: 'regex', plain: 'bar', masked: '[X]', flags: '' },
]));
assert.throws(
    () => masker.validateMappings([
        { type: 'literal', plain: 'secret', masked: '[X]' },
        { type: 'regex', plain: 'foo', masked: '[X]', flags: '' },
    ]),
    (error) => error.code === 'DUPLICATE_MASKED'
);

const serialized = masker.stringifyConfig({
    enabled: false,
    mappings: [
        { plain: 'secret', masked: 'MASKED' },
        { type: 'regex', plain: String.raw`\d+`, masked: '[NUMBER]', flags: 'gmi' },
    ],
});
assert.deepStrictEqual(JSON.parse(serialized), {
    version: 2,
    enabled: false,
    mappings: [
        { type: 'literal', plain: 'secret', masked: 'MASKED', flags: '' },
        { type: 'regex', plain: String.raw`\d+`, masked: '[NUMBER]', flags: 'im' },
    ],
});
assert.deepStrictEqual(masker.parseConfig(serialized), JSON.parse(serialized));
assert.deepStrictEqual(masker.parseConfig(JSON.stringify({
    version: 1,
    enabled: true,
    mappings: [{ plain: 'legacy', masked: 'LEGACY' }],
})), {
    version: 2,
    enabled: true,
    mappings: [{ type: 'literal', plain: 'legacy', masked: 'LEGACY', flags: '' }],
});
assert.deepStrictEqual(masker.parseConfig('{}'), {
    version: 2,
    enabled: true,
    mappings: [],
});
assert.throws(() => masker.parseConfig('{bad json'), /invalid json/i);
assert.strictEqual(masker.DEFAULT_CONFIG.version, 2);
assert.strictEqual(masker.DEFAULT_CONFIG.enabled, true);
assert.match(masker.STORAGE_KEY, /text-splitter/);

const page = fs.readFileSync(path.resolve(__dirname, '../text-splitter.html'), 'utf8');
assert.match(page, /<script src="regex-risk-analyzer\.js"><\/script>/);
assert.match(page, /<script src="text-masker\.js\?v=2"><\/script>/);
assert.match(page, /id="maskingEnabled"[^>]*checked/);
assert.match(page, /id="maskConfigBtn"/);
assert.match(page, /id="unmaskBtn"/);
assert.match(page, /id="mask-config-modal"/);
assert.match(page, /id="maskMappings"/);
assert.match(page, /id="addMaskMappingBtn"/);
assert.match(page, /id="addIpv4MaskExampleBtn"/);
assert.match(page, /class="mask-type-select"/);
assert.match(page, /class="mask-flags-input"/);
assert.match(page, /id="saveMaskConfigBtn"/);
assert.match(page, /id="importMaskConfigBtn"/);
assert.match(page, /id="exportMaskConfigBtn"/);
assert.match(page, /id="maskConfigFileInput"/);
assert.match(page, /localStorage\.getItem\(TextMasker\.STORAGE_KEY\)/);
assert.match(page, /localStorage\.setItem\(TextMasker\.STORAGE_KEY/);
assert.match(page, /TextMasker\.CONFIG_VERSION === REQUIRED_TEXT_MASKER_VERSION/);
assert.match(page, /function loadMaskConfig\(\) \{\s*if \(!isMaskingRuntimeReady\(\)\) \{[\s\S]*?return;\s*\}/);
assert.match(page, /if \(maskingEnabled\.checked\) \{\s*if \(!requireMaskingRuntime\(\)\) return;/);
assert.match(page, /function openMaskConfig\(\) \{\s*if \(!requireMaskingRuntime\(\)\) return;/);
assert.match(page, /脱敏脚本版本过旧，请按 Ctrl\+F5 强制刷新后重试/);
assert.match(page, /TextMasker\.maskText\(source, maskConfig\.mappings\)/);
assert.match(page, /TextMasker\.unmaskText\(inputText\.value, maskConfig\.mappings\)/);
assert.match(page, /RegexRiskAnalyzer\.analyzeRegexRisks\(plainInput\.value\)/);
assert.match(page, /正则映射不可还原/);
assert.match(page, /@media \(max-width: 720px\)[\s\S]*?\.mask-mapping-row\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0, 1fr\) 34px;/);
assert.match(page, /renderResults\(\[unmaskedText\], \{ mode: 'unmask' \}\)/);
assert.match(page, /getElementById\('closeMaskConfigBtn'\)\.addEventListener\('click', closeMaskConfig\)/);
assert.match(page, /getElementById\('cancelMaskConfigBtn'\)\.addEventListener\('click', closeMaskConfig\)/);
assert.match(page, /getElementById\('saveMaskConfigBtn'\)\.addEventListener\('click', saveMaskConfig\)/);
assert.doesNotMatch(page, /event\.target === maskConfigModal/);
const escapeHandler = page.match(/document\.addEventListener\('keydown',[\s\S]*?\n        \}\);/);
assert.ok(escapeHandler, 'Escape key handler should exist');
assert.doesNotMatch(escapeHandler[0], /closeMaskConfig\(\)/);
assert.match(page, /<span>V1\.18<\/span>/);
assert.match(page, /<div class="changelog-date">2026\u5e748\u670817\u65e5<\/div>[\s\S]*?<div class="changelog-version">V1\.18<\/div>/);
assert.match(page, /<div class="changelog-date">2026\u5e748\u670813\u65e5<\/div>[\s\S]*?<div class="changelog-version">V1\.17<\/div>[\s\S]*?<div class="changelog-version">V1\.16<\/div>[\s\S]*?<div class="changelog-version">V1\.15<\/div>/);
assert.match(page, /<div class="changelog-date">2026\u5e747\u670823\u65e5<\/div>[\s\S]*?<div class="changelog-version">V1\.14<\/div>/);
assert.match(page, /<div class="changelog-date">2026\u5e747\u670815\u65e5<\/div>[\s\S]*?<div class="changelog-version">V1\.09<\/div>/);

console.log('text masker behavior and integration passed');
