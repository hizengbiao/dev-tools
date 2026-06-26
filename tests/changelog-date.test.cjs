const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');

function listHtmlFiles() {
    return fs.readdirSync(rootDir)
        .filter((file) => file.endsWith('.html'))
        .sort();
}

function getVersionIntroducedDate(file, version) {
    return execFileSync(
        'git',
        ['-c', 'safe.directory=D:/projects/vibe-coding/dev-tools', 'log', '--reverse', '--format=%cs', '-S', `<span>${version}</span>`, '--', file],
        { cwd: rootDir, encoding: 'utf8' }
    ).trim().split(/\r?\n/).filter(Boolean)[0];
}

function toChineseDate(isoDate) {
    const [year, month, day] = isoDate.split('-').map(Number);
    return `${year}年${month}月${day}日`;
}

function getTopVersion(html) {
    const match = html.match(/<div class="version-info"[\s\S]*?<span>(V\d+\.\d+)<\/span>/);
    return match && match[1];
}

function getChangelogGroups(html) {
    const groups = [];
    const groupPattern = /<div class="changelog-date">([^<]+)<\/div>([\s\S]*?)(?=<div class="changelog-date">|<\/div>\s*<\/div>\s*<\/div>\s*<script|<\/div>\s*<script|$)/g;
    let match;
    while ((match = groupPattern.exec(html)) !== null) {
        groups.push({
            date: match[1],
            body: match[2],
        });
    }
    return groups;
}

function findVersionGroup(groups, version) {
    return groups.find((group) => group.body.includes(`<div class="changelog-version">${version}</div>`));
}

const checkedFiles = [];

for (const file of listHtmlFiles()) {
    const html = fs.readFileSync(path.join(rootDir, file), 'utf8');
    const topVersion = getTopVersion(html);
    if (!topVersion) continue;

    checkedFiles.push(file);

    const groups = getChangelogGroups(html);
    const versionGroup = findVersionGroup(groups, topVersion);
    assert.ok(versionGroup, `${file}: changelog 缺少顶部版本 ${topVersion}`);

    const introducedDate = getVersionIntroducedDate(file, topVersion);
    assert.ok(introducedDate, `${file}: 无法从 git 历史中找到顶部版本 ${topVersion} 的引入日期`);

    const expectedDate = toChineseDate(introducedDate);
    assert.equal(
        versionGroup.date,
        expectedDate,
        `${file}: 顶部版本 ${topVersion} 的引入日期是 ${expectedDate}，实际位于 ${versionGroup.date}`
    );
}

assert.ok(checkedFiles.length > 0, '没有找到带 version-info 的 HTML 页面');
