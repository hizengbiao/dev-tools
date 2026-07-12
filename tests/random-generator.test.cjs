const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const random = require(path.join(root, 'random-generator.js'));

let sequence = 0;
function deterministicRandomBytes(length) {
    return Uint8Array.from({ length }, () => sequence++ % 256);
}

const uuid = random.generateUuidV4(deterministicRandomBytes);
assert.match(uuid, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
assert.strictEqual(random.generateRandomString(8, 'ab', () => 0), 'aaaaaaaa');
assert.strictEqual(random.generateRandomString(8, 'ab', () => 0.99), 'bbbbbbbb');
assert.deepStrictEqual(random.generateRandomIntegers({ count: 3, min: 10, max: 12 }, () => 0), [10, 10, 10]);
assert.deepStrictEqual(random.generateRandomIntegers({ count: 2, min: 10, max: 12 }, () => 0.99), [12, 12]);
assert.strictEqual(random.getCharacterSet({ lower: true, upper: false, digits: true, symbols: false }), 'abcdefghijklmnopqrstuvwxyz0123456789');
assert.throws(() => random.generateBatch({ type: 'string', count: 0 }), /count must be positive/);
assert.throws(() => random.generateBatch({ type: 'string', count: 1, length: 4, charset: '' }), /charset is required/);
assert.deepStrictEqual(
    random.generateBatch({ type: 'number', count: 2, min: 1, max: 3 }, () => 0),
    ['1', '1']
);
const password = random.generatePassword(8, {
    lower: true,
    upper: true,
    digits: true,
    symbols: true,
}, () => 0);
assert.strictEqual(password.length, 8);
assert.match(password, /[a-z]/);
assert.match(password, /[A-Z]/);
assert.match(password, /[0-9]/);
assert.match(password, /[!@#$%^&*()_+\-=[\]{};:,.<>?]/);
assert.deepStrictEqual(
    random.generateBatch({
        type: 'password',
        count: 2,
        length: 8,
        lower: true,
        upper: true,
        digits: true,
        symbols: true,
    }, () => 0).map((value) => value.length),
    [8, 8]
);

const page = fs.readFileSync(path.join(root, 'random-generator.html'), 'utf8');
assert.match(page, /<title>UUID \/ 随机值生成器<\/title>/);
assert.match(page, /<link rel="stylesheet" href="nav\.css">/);
assert.match(page, /<script src="nav\.js" defer><\/script>/);
assert.match(page, /<script src="random-generator\.js"><\/script>/);
assert.match(page, /<span>V1\.00<\/span>/);
assert.match(page, /<div class="changelog-date">2026年7月11日<\/div>[\s\S]*?<div class="changelog-version">V1\.00<\/div>/);
assert.match(page, /id="valueType"/);
assert.match(page, /id="countInput"/);
assert.match(page, /id="lengthInput"/);
assert.match(page, /id="resultList"/);
assert.match(page, /RandomGenerator\.generateBatch/);
assert.match(page, /type: selectedType/);
assert.doesNotMatch(page, /valueType === 'password' \? 'string' : valueType/);
assert.match(page, /function syncTypeDefaults/);
assert.match(page, /valueType\.addEventListener\('change', syncTypeDefaults\)/);

const nav = fs.readFileSync(path.join(root, 'nav.js'), 'utf8');
const home = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
const development = fs.readFileSync(path.join(root, 'DEVELOPMENT.md'), 'utf8');
assert.match(nav, /name: '随机生成', path: 'random-generator\.html'/);
assert.match(home, /href="random-generator\.html"/);
assert.match(readme, /random-generator\.html/);
assert.match(development, /random-generator\.html/);

console.log('random generator behavior passed');
