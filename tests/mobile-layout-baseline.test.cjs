const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const { MOBILE_LAYOUT_BASELINE_PAGES } = require(path.join(root, 'mobile-layout-baseline.js'));

assert.ok(MOBILE_LAYOUT_BASELINE_PAGES.length >= 6, 'mobile baseline should cover key input/output tools');

for (const page of MOBILE_LAYOUT_BASELINE_PAGES) {
    const html = fs.readFileSync(path.join(root, page.path), 'utf8');
    assert.match(html, /<meta name="viewport" content="width=device-width, initial-scale=1\.0">/, `${page.path} needs a mobile viewport`);
    assert.match(html, /@media\s*\(max-width:\s*\d+px\)/, `${page.path} needs at least one mobile breakpoint`);
    for (const snippet of page.requiredSnippets) {
        assert.ok(html.includes(snippet), `${page.path} is missing mobile layout baseline snippet: ${snippet}`);
    }
}

console.log('mobile layout baseline passed');
