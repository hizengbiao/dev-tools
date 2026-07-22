const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const changelogModule = fs.readFileSync(path.join(rootDir, 'changelog.js'), 'utf8');
const changelogStyles = fs.readFileSync(path.join(rootDir, 'changelog.css'), 'utf8');
const htmlFiles = fs.readdirSync(rootDir)
    .filter((file) => file.endsWith('.html'))
    .sort();

assert.match(changelogModule, /function showChangelog\(\)/);
assert.match(changelogModule, /function closeChangelog\(\)/);
assert.match(changelogModule, /window\.showChangelog = showChangelog/);
assert.match(changelogModule, /window\.closeChangelog = closeChangelog/);
assert.match(changelogModule, /event\.target === modal/);
assert.match(changelogModule, /event\.key === 'Escape'/);
assert.match(changelogModule, /trigger\.setAttribute\('tabindex', '0'\)/);
assert.match(changelogModule, /event\.key === 'Enter' \|\| event\.key === ' '/);
assert.match(changelogModule, /body\.scrollTop = 0/);
assert.match(changelogModule, /lastFocusedElement\.focus\(\)/);
assert.match(changelogStyles, /#changelog-modal \.changelog-dialog\s*\{[\s\S]*?max-height:\s*calc\(100vh - 40px\);[\s\S]*?display:\s*flex;[\s\S]*?flex-direction:\s*column;[\s\S]*?animation:\s*none;[\s\S]*?transform:\s*none;/);
assert.match(changelogStyles, /#changelog-modal \.changelog-body\s*\{[\s\S]*?min-height:\s*0;[\s\S]*?overflow-y:\s*auto;/);

const pagesWithChangelog = [];

for (const file of htmlFiles) {
    const html = fs.readFileSync(path.join(rootDir, file), 'utf8');
    if (!html.includes('id="changelog-modal"')) continue;

    pagesWithChangelog.push(file);

    assert.match(
        html,
        /<script src="changelog\.js"><\/script>/,
        `${file} should include changelog.js`
    );
    assert.match(
        html,
        /<link rel="stylesheet" href="changelog\.css">/,
        `${file} should include changelog.css`
    );
    assert.match(html, /id="changelog-modal" class="modal-overlay changelog-overlay"/, `${file} should use changelog overlay styles`);
    assert.match(html, /class="modal-content changelog-dialog"/, `${file} should use changelog dialog styles`);
    assert.match(html, /class="modal-header changelog-header"/, `${file} should use changelog header styles`);
    assert.match(html, /class="modal-body changelog-body"/, `${file} should use changelog body styles`);
    assert.match(html, /class="close-modal changelog-close"/, `${file} should use changelog close styles`);
    assert.doesNotMatch(
        html,
        /function showChangelog\(\)/,
        `${file} should not redefine showChangelog`
    );
    assert.doesNotMatch(
        html,
        /function closeChangelog\(\)/,
        `${file} should not redefine closeChangelog`
    );
    assert.match(
        html,
        /<h3>🚀 版本更新说明<\/h3>/,
        `${file} should keep the unified changelog title`
    );
}

assert.ok(pagesWithChangelog.length > 0, '没有找到带版本更新说明的页面');

console.log('changelog module integration passed');
