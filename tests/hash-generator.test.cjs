const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const hash = require(path.join(root, 'hash-generator.js'));

(async () => {
    const textResult = await hash.hashText('hello');
    assert.deepStrictEqual(textResult, {
        MD5: '5d41402abc4b2a76b9719d911017c592',
        'SHA-1': 'aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d',
        'SHA-256': '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824',
        'SHA-512': '9b71d224bd62f3785d96d46ad3ea3d73319bfbc2890caadae2dff72519673ca72323c3d99ba5c11d7c7acc6e14b8c5da0c4663475c2e5c3adef46f73bcdec043',
    });

    const bytesResult = await hash.hashBytes(new TextEncoder().encode('hello'));
    assert.deepStrictEqual(bytesResult, textResult);
    assert.strictEqual(hash.formatBytes(0), '0 B');
    assert.strictEqual(hash.formatBytes(1536), '1.5 KB');
    assert.strictEqual(hash.normalizeHex(' A B C '), 'abc');
    assert.strictEqual(hash.compareHash(textResult['SHA-256'], textResult['SHA-256']), true);
    assert.strictEqual(hash.compareHash(textResult['SHA-256'], 'bad'), false);

    const page = fs.readFileSync(path.join(root, 'hash-generator.html'), 'utf8');
    assert.match(page, /<title>哈希\/摘要工具<\/title>/);
    assert.match(page, /<link rel="stylesheet" href="nav\.css">/);
    assert.match(page, /<script src="nav\.js" defer><\/script>/);
    assert.match(page, /<script src="hash-generator\.js"><\/script>/);
    assert.match(page, /<span>V1\.00<\/span>/);
    assert.match(page, /<div class="changelog-date">2026年7月11日<\/div>[\s\S]*?<div class="changelog-version">V1\.00<\/div>/);
    assert.match(page, /id="text-input"/);
    assert.match(page, /id="file-input"/);
    assert.match(page, /id="clear-file-btn"/);
    assert.match(page, /id="hash-results"/);
    assert.match(page, /id="compare-input"/);
    assert.match(page, /HashGenerator\.hashText/);
    assert.match(page, /HashGenerator\.hashBytes/);
    assert.match(page, /HashGenerator\.compareHash/);
    assert.match(page, /function clearTextHash/);
    assert.match(page, /function clearFileHash/);
    assert.match(page, /currentHashSource === 'text'/);
    assert.match(page, /currentHashSource === 'file'/);
    assert.match(page, /function resetHashResults/);

    const nav = fs.readFileSync(path.join(root, 'nav.js'), 'utf8');
    const home = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
    const development = fs.readFileSync(path.join(root, 'DEVELOPMENT.md'), 'utf8');
    assert.match(nav, /name: '哈希摘要', path: 'hash-generator\.html'/);
    assert.match(home, /href="hash-generator\.html"/);
    assert.match(readme, /hash-generator\.html/);
    assert.match(development, /hash-generator\.html/);

    assert.strictEqual(
        crypto.createHash('sha256').update('hello').digest('hex'),
        textResult['SHA-256']
    );

    console.log('hash generator behavior passed');
})();
