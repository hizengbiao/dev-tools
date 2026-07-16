const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const nav = fs.readFileSync(path.join(root, 'nav.js'), 'utf8');

assert.match(nav, /function preserveWindowScrollOnPaste\(event\)/);
assert.match(nav, /target\.matches\('textarea, \[contenteditable="true"\]'/);
assert.match(nav, /const scrollPosition = \{ x: window\.scrollX, y: window\.scrollY \}/);
assert.match(nav, /let remainingFrames = 12/);
assert.match(nav, /remainingFrames -= 1/);
assert.match(nav, /window\.requestAnimationFrame\(restoreWindowScroll\)/);
assert.match(nav, /window\.setTimeout\(restoreWindowScroll, 180\)/);
assert.match(nav, /window\.scrollTo\(scrollPosition\.x, scrollPosition\.y\)/);
assert.match(nav, /document\.addEventListener\('paste', preserveWindowScrollOnPaste, true\)/);

const textareaPages = fs.readdirSync(root)
    .filter((name) => name.endsWith('.html'))
    .filter((name) => fs.readFileSync(path.join(root, name), 'utf8').includes('<textarea'));

assert.ok(textareaPages.includes('regex-tester.html'));
assert.ok(textareaPages.includes('text_escape_formatter_final.html'));
textareaPages.forEach((name) => {
    const page = fs.readFileSync(path.join(root, name), 'utf8');
    assert.match(page, /<script src="nav\.js"[^>]*><\/script>/, `${name} should load the shared paste guard through nav.js`);
});

console.log(`paste scroll guard integration passed for ${textareaPages.length} pages`);
