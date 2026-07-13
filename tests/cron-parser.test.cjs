const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const cron = require(path.join(root, 'cron-parser.js'));

assert.deepStrictEqual(cron.detectCronType('*/15 * * * *'), { type: 'linux', fields: 5 });
assert.deepStrictEqual(cron.detectCronType('0 */10 * * * ?'), { type: 'quartz', fields: 6 });
assert.deepStrictEqual(cron.parseField('*/20', 0, 59, 'minute'), [0, 20, 40]);
assert.deepStrictEqual(cron.parseField('1,3-5', 0, 10, 'minute'), [1, 3, 4, 5]);
assert.throws(() => cron.parseField('90', 0, 59, 'minute'), /minute out of range/);

assert.strictEqual(cron.explainCron('*/30 * * * *'), '每隔 30 分钟执行一次。');
assert.strictEqual(cron.explainCron('0 0 12 * * ?'), '每天 12:00:00 执行。');
assert.strictEqual(cron.explainCron('0 30 9 ? * 1-5'), '每周一至周五 09:30:00 执行。');
assert.strictEqual(
    cron.explainCron('15 10 8 1 1 ? 2027'),
    '在 2027 年 1 月 1 日 08:10:15 执行。'
);
assert.match(cron.explainCron('5,20 8-10 * * *'), /分钟为 5、20/);
assert.match(cron.explainCron('5,20 8-10 * * *'), /小时为 8 至 10/);

const nextLinux = cron.getNextRuns('*/30 * * * *', {
    from: new Date('2026-07-11T10:05:00Z'),
    count: 3,
});
assert.deepStrictEqual(
    nextLinux.map((date) => date.toISOString()),
    ['2026-07-11T10:30:00.000Z', '2026-07-11T11:00:00.000Z', '2026-07-11T11:30:00.000Z']
);

const nextQuartz = cron.getNextRuns('0 0 12 * * ?', {
    from: new Date('2026-07-11T10:05:00Z'),
    count: 2,
});
assert.deepStrictEqual(
    nextQuartz.map((date) => date.toISOString()),
    ['2026-07-11T12:00:00.000Z', '2026-07-12T12:00:00.000Z']
);

assert.throws(() => cron.getNextRuns('* * *', { from: new Date(), count: 1 }), /Cron expression must have 5, 6, or 7 fields/);

const page = fs.readFileSync(path.join(root, 'cron-parser.html'), 'utf8');
assert.match(page, /<title>Cron 表达式解析工具<\/title>/);
assert.match(page, /<script src="cron-parser\.js"><\/script>/);
assert.match(page, /<span>V1\.01<\/span>/);
assert.match(page, /id="cron-explanation"/);
assert.match(page, /CronParser\.explainCron/);
assert.match(page, /<div class="changelog-date">2026年7月13日<\/div>[\s\S]*?<div class="changelog-version">V1\.01<\/div>/);
assert.match(page, /<div class="changelog-date">2026年7月11日<\/div>[\s\S]*?<div class="changelog-version">V1\.00<\/div>/);
assert.match(page, /id="cron-input"/);
assert.match(page, /id="count-input"/);
assert.match(page, /id="result-list"/);
assert.match(page, /CronParser\.getNextRuns/);

const nav = fs.readFileSync(path.join(root, 'nav.js'), 'utf8');
const home = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
const development = fs.readFileSync(path.join(root, 'DEVELOPMENT.md'), 'utf8');
assert.match(nav, /name: 'Cron 解析', path: 'cron-parser\.html'/);
assert.match(home, /href="cron-parser\.html"/);
assert.match(readme, /cron-parser\.html/);
assert.match(development, /cron-parser\.html/);

console.log('cron parser behavior passed');
