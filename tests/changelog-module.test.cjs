const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const changelogModule = fs.readFileSync(path.join(rootDir, 'changelog.js'), 'utf8');
const htmlFiles = fs.readdirSync(rootDir)
    .filter((file) => file.endsWith('.html'))
    .sort();

assert.match(changelogModule, /function showChangelog\(\)/);
assert.match(changelogModule, /function closeChangelog\(\)/);
assert.match(changelogModule, /window\.showChangelog = showChangelog/);
assert.match(changelogModule, /window\.closeChangelog = closeChangelog/);
assert.match(changelogModule, /event\.target === modal/);

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
