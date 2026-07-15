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
    [{ plain: '  secret  ', masked: '  MASKED  ' }]
);
assert.throws(
    () => masker.validateMappings([{ plain: 'secret', masked: '' }]),
    /both sides/i
);
assert.throws(
    () => masker.validateMappings([
        { plain: 'secret', masked: 'ONE' },
        { plain: 'secret', masked: 'TWO' },
    ]),
    /duplicate plain/i
);
assert.throws(
    () => masker.validateMappings([
        { plain: 'one', masked: 'MASK' },
        { plain: 'two', masked: 'MASK' },
    ]),
    /duplicate masked/i
);

const serialized = masker.stringifyConfig({
    enabled: false,
    mappings: [{ plain: 'secret', masked: 'MASKED' }],
});
assert.deepStrictEqual(JSON.parse(serialized), {
    version: 1,
    enabled: false,
    mappings: [{ plain: 'secret', masked: 'MASKED' }],
});
assert.deepStrictEqual(masker.parseConfig(serialized), {
    version: 1,
    enabled: false,
    mappings: [{ plain: 'secret', masked: 'MASKED' }],
});
assert.deepStrictEqual(masker.parseConfig('{}'), {
    version: 1,
    enabled: true,
    mappings: [],
});
assert.throws(() => masker.parseConfig('{bad json'), /invalid json/i);
assert.strictEqual(masker.DEFAULT_CONFIG.enabled, true);
assert.match(masker.STORAGE_KEY, /text-splitter/);

const page = fs.readFileSync(path.resolve(__dirname, '../text-splitter.html'), 'utf8');
assert.match(page, /<script src="text-masker\.js"><\/script>/);
assert.match(page, /id="maskingEnabled"[^>]*checked/);
assert.match(page, /id="maskConfigBtn"/);
assert.match(page, /id="unmaskBtn"/);
assert.match(page, /id="mask-config-modal"/);
assert.match(page, /id="maskMappings"/);
assert.match(page, /id="addMaskMappingBtn"/);
assert.match(page, /id="saveMaskConfigBtn"/);
assert.match(page, /id="importMaskConfigBtn"/);
assert.match(page, /id="exportMaskConfigBtn"/);
assert.match(page, /id="maskConfigFileInput"/);
assert.match(page, /localStorage\.getItem\(TextMasker\.STORAGE_KEY\)/);
assert.match(page, /localStorage\.setItem\(TextMasker\.STORAGE_KEY/);
assert.match(page, /TextMasker\.maskText\(inputText\.value, maskConfig\.mappings\)/);
assert.match(page, /TextMasker\.unmaskText\(inputText\.value, maskConfig\.mappings\)/);
assert.match(page, /renderResults\(\[unmaskedText\], \{ mode: 'unmask' \}\)/);
assert.match(page, /<span>V1\.09<\/span>/);
assert.match(page, /<div class="changelog-date">2026\u5e747\u670815\u65e5<\/div>[\s\S]*?<div class="changelog-version">V1\.09<\/div>/);

console.log('text masker behavior and integration passed');
