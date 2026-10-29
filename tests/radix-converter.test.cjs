const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { parseInteger, formatInteger, convertBatch, validateBase, MAX_DIGITS, MAX_LINES, MAX_TEXT } = require('../radix-converter.js');
for (let base = 2; base <= 36; base++) {
    for (const value of [0n, 1n, -1n, 255n, -1024n, 9007199254740993n, (1n << 512n) - 1n]) {
        assert.equal(parseInteger(formatInteger(value, base), base), value);
    }
}
assert.equal(parseInteger(' +0xF_f ', 16), 255n);
assert.equal(parseInteger('-0B100', 2), -4n);
assert.equal(parseInteger('0o777', 8), 511n);
assert.equal(parseInteger('010', 10), 10n);
assert.equal(parseInteger('-0', 10), 0n);
assert.equal(parseInteger('zZ', 36), 1295n);
assert.equal(parseInteger('0x', 36), 33n);
assert.equal(formatInteger(-255n, 16, { prefix: true, uppercase: false }), '-0xff');
assert.equal(formatInteger(0n, 2, { prefix: true }), '0b0');
assert.equal(formatInteger(255n, 10, { prefix: true }), '255');
for (const base of [1, 37, 2.1, NaN, Infinity, '16', null]) assert.throws(() => validateBase(base));
for (const text of ['', '+', '-', '0x', '0xFG', '1.2', '12abc', '1e3', '1 2', '_1', '1_', '1__2', '--1', '１２', '<script>']) assert.throws(() => parseInteger(text, 10));
assert.throws(() => parseInteger('102', 2));
assert.throws(() => parseInteger('0x10', 2), /前缀/);
assert.throws(() => parseInteger('0b10', 10), /前缀/);
assert.throws(() => formatInteger(42, 16), /BigInt/);
assert.equal(parseInteger('1'.repeat(MAX_DIGITS), 2).toString(2).length, MAX_DIGITS);
assert.throws(() => parseInteger('1'.repeat(MAX_DIGITS + 1), 2), /最多/);
assert.throws(() => parseInteger('_'.repeat(MAX_DIGITS * 2 + 1), 2), /最多/);
const rows = convertBatch('255\r\n\r\nwrong\r\n-1024\n 9007199254740993 ', 10, [2, 8, 10, 16, 36]);
assert.deepEqual(rows.map(row => row.line), [1, 3, 4, 5]);
assert.equal(rows[0].outputs[3], 'FF');
assert.ok(rows[1].error);
assert.equal(rows[2].outputs[2], '-1024');
assert.equal(rows[3].outputs[3], '20000000000001');
assert.throws(() => convertBatch('\n\t ', 10, [16]), /请输入/);
assert.throws(() => convertBatch('1\n'.repeat(MAX_LINES + 1), 10, [16]), /最多转换/);
assert.throws(() => convertBatch(' '.repeat(MAX_TEXT + 1), 10, [16]), /字符/);
assert.throws(() => convertBatch('1', 10, [37]), /进制/);
const page = fs.readFileSync(path.join(__dirname, '../radix-converter.html'), 'utf8');
for (const source of ['nav.js', 'changelog.js', 'clipboard-utils.js', 'radix-converter.js?v=1.00', 'radix-converter-ui.js?v=1.01']) assert.ok(page.includes(source));
assert.match(page, /data-clipboard-paste-target="radix-input" data-clipboard-paste-action="convert-btn"/);
assert.match(page, /<span>V1\.01<\/span>/);
assert.doesNotMatch(page, /id="target-base"/);
const ui = fs.readFileSync(path.join(__dirname, '../radix-converter-ui.js'), 'utf8');
assert.doesNotMatch(ui, /target-base|自定义进制/);
assert.match(page, /2026年10月30日/);
assert.doesNotMatch(fs.readFileSync(path.join(__dirname, '../radix-converter.js'), 'utf8'), /parseInt\(/);
console.log('radix converter precision, validation, batch and integration passed');
