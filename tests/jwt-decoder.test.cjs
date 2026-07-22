const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const jwt = require(path.join(root, 'jwt-decoder.js'));

const token = [
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
    'eyJzdWIiOiIxMjMiLCJuYW1lIjoi5byg5LiJIiwiZXhwIjoxNzEwMDAwMDAwLCJpYXQiOjE3MDk5OTAwMDAsImFjdGl2ZSI6dHJ1ZX0',
    'signature'
].join('.');

const decoded = jwt.decodeJwt(token);
assert.deepStrictEqual(decoded.header, { alg: 'HS256', typ: 'JWT' });
assert.deepStrictEqual(decoded.payload.sub, '123');
assert.deepStrictEqual(decoded.payload.name, '张三');
assert.strictEqual(decoded.signature, 'signature');
assert.strictEqual(decoded.isExpired(new Date('2024-03-10T00:00:01Z')), true);
assert.strictEqual(decoded.isExpired(new Date('2024-03-09T00:00:00Z')), false);
assert.match(decoded.timeFields.exp.iso, /^2024-03-09T16:00:00\.000Z$/);
assert.match(jwt.formatTimestamp(1710000000), /^2024-03-09T16:00:00\.000Z/);
assert.throws(() => jwt.decodeJwt('bad-token'), /JWT must contain 3 parts/);
assert.throws(() => jwt.decodeJwt('a.b.c'), /Invalid JWT JSON/);

const page = fs.readFileSync(path.join(root, 'jwt-decoder.html'), 'utf8');
assert.match(page, /<title>JWT 解析工具<\/title>/);
assert.match(page, /<link rel="stylesheet" href="nav\.css">/);
assert.match(page, /<script src="nav\.js" defer><\/script>/);
assert.match(page, /<script src="jwt-decoder\.js"><\/script>/);
assert.match(page, /<span>V1\.02<\/span>/);
assert.match(page, /<div class="changelog-date">2026年7月23日<\/div>[\s\S]*?<div class="changelog-version">V1\.02<\/div>/);
assert.match(page, /<div class="changelog-date">2026年7月23日<\/div>[\s\S]*?<div class="changelog-version">V1\.01<\/div>/);
assert.match(page, /<div class="changelog-date">2026年7月11日<\/div>[\s\S]*?<div class="changelog-version">V1\.00<\/div>/);
assert.match(page, /仅本地解析/);
assert.match(page, /不验证签名可信性/);
assert.match(page, /id="jwt-input"/);
assert.match(page, /id="header-output"/);
assert.match(page, /id="payload-output"/);
assert.match(page, /id="time-output"/);
assert.match(page, /JwtDecoder\.decodeJwt/);

const nav = fs.readFileSync(path.join(root, 'nav.js'), 'utf8');
const home = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
const development = fs.readFileSync(path.join(root, 'DEVELOPMENT.md'), 'utf8');
assert.match(nav, /name: 'JWT 解析', path: 'jwt-decoder\.html'/);
assert.match(home, /href="jwt-decoder\.html"/);
assert.match(readme, /jwt-decoder\.html/);
assert.match(development, /jwt-decoder\.html/);

console.log('jwt decoder behavior passed');
