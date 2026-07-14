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
assert.strictEqual(cron.explainCron('0 * * * *'), '每小时整点执行。');
assert.strictEqual(cron.explainCron('30 * * * *'), '每小时第 30 分钟执行。');
assert.strictEqual(cron.explainCron('0 */2 * * *'), '每隔 2 小时整点执行一次。');
assert.strictEqual(cron.explainCron('0 18 0/3 * * ?'), '每天从 00:18 开始，每隔 3 小时执行一次。');
assert.strictEqual(cron.explainCron('0 0 * * * ?'), '每小时整点执行。');
assert.strictEqual(cron.explainCron('30 15 * * * ?'), '每小时第 15 分 30 秒执行。');
assert.strictEqual(cron.explainCron('0 0 12 * * ?'), '每天 12:00:00 执行。');
assert.strictEqual(cron.explainCron('0 30 9 ? * 1-5'), '每周一至周五 09:30:00 执行。');
assert.strictEqual(
    cron.explainCron('15 10 8 1 1 ? 2027'),
    '在 2027 年 1 月 1 日 08:10:15 执行。'
);
assert.strictEqual(cron.explainCron('5,20 8-10 * * *'), '每天在 8 至 10 点的第 5、20 分钟执行。');

const validLinuxExpressions = [
    '* * * * *', '*/5 * * * *', '0 * * * *', '0 0 * * *', '30 8 * * *',
    '0 9 * * 1-5', '0 0 1 * *', '0 0 1 1 *', '0,15,30,45 * * * *', '0 8,12,18 * * *'
];
const validSpringExpressions = [
    '* * * * * *', '*/5 * * * * *', '0 * * * * *', '0 */5 * * * *', '0 0 * * * *',
    '0 0 0 * * *', '0 30 8 * * *', '0 0 9 * * MON-FRI', '0 0 0 1 * *', '0 0 0 1 JAN *'
];
const validQuartzExpressions = [
    '* * * * * ?', '0/5 * * * * ?', '0 * * * * ?', '0 0/5 * * * ?', '0 0 * * * ?',
    '0 0 0 * * ?', '0 30 8 * * ?', '0 0 9 ? * MON', '0 0 0 L * ?', '0 0 18 LW * ?',
    '0 0 9 ? * MON#2', '0 0 0 1 1 ? 2027'
];

for (const expression of [...validLinuxExpressions, ...validSpringExpressions, ...validQuartzExpressions]) {
    assert.doesNotThrow(() => cron.parseCron(expression), `expected valid expression: ${expression}`);
    assert.doesNotThrow(() => cron.explainCron(expression), `expected explainable expression: ${expression}`);
}

const invalidExpressions = [
    '', '* * * *', '* * * * * * * *', '60 * * * *', '0 24 * * *', '0 0 32 * *',
    '0 0 1 13 *', '61 * * * * *', '0 60 * * * *', '0 0 25 * * *',
    '*/0 * * * *', '*/-1 * * * *', '*/abc * * * *', '1/0 * * * *',
    '10-5 * * * *', '0 18-9 * * *', '0 0 20-10 * *', '0 0 1 12-1 *',
    'abc * * * *', '0 xx * * *', '0 0 上午9点 * * *', '0 0 9 ? UNKNOWN', '0 0 9 ? * MONDAYYYY',
    '0 0 9 ? * ?', '0 0 9 ? * MON#0', '0 0 9 ? * MON#6', '0 0 9 32W * ?',
    '0 0 9 15L * ?', '0 0 9 ? * L#2', '0 0 30 2 *', '0 0 31 4 *', '0 0 31 6 *',
    '0 0 0 29 2 ? 2027'
];
for (const expression of invalidExpressions) {
    assert.throws(() => cron.parseCron(expression), undefined, `expected invalid expression: ${expression}`);
}

const validBoundaryExpressions = [
    '0 0 1 1 0', '59 23 31 12 6', '0 0 0 1 1 SUN', '59 59 23 31 12 SAT',
    '59 59 23 31 12 ? 2099', '0 0 29 2 *', '0 0 31 12 *', '0 0 0 29 2 ? 2028'
];
for (const expression of validBoundaryExpressions) {
    assert.doesNotThrow(() => cron.parseCron(expression), `expected valid boundary expression: ${expression}`);
}
assert.doesNotThrow(() => cron.parseCron('0 0 31 2 MON'));

assert.strictEqual(cron.explainCron('* * * * *'), '每分钟执行一次。');
assert.strictEqual(cron.explainCron('0 0 * * *'), '每天 00:00 执行。');
assert.strictEqual(cron.explainCron('0 0 1 * *'), '每月 1 日 00:00 执行。');
assert.strictEqual(cron.explainCron('0 0 1 1 *'), '每年 1 月 1 日 00:00 执行。');
assert.strictEqual(cron.explainCron('0 9 * * 1-5'), '每周一至周五 09:00 执行。');
assert.strictEqual(cron.explainCron('0,15,30,45 * * * *'), '每小时第 0、15、30、45 分钟执行。');
assert.strictEqual(cron.explainCron('0 8,12,18 * * *'), '每天在 8、12、18 点整点执行。');
assert.strictEqual(cron.explainCron('0-9 * * * *'), '每小时第 0 至 9 分钟内每分钟执行。');
assert.strictEqual(cron.explainCron('0 9-18 * * *'), '每天在 9 至 18 点整点执行。');
assert.strictEqual(cron.explainCron('0 9-18 * * 1-5'), '每周一至周五，在 9 至 18 点整点执行。');
assert.strictEqual(cron.explainCron('0 0 1,10,20 * *'), '每月 1、10、20 日 00:00 执行。');
assert.strictEqual(cron.explainCron('0 0 */3 * *'), '每隔 3 天在 00:00 执行一次。');
assert.strictEqual(cron.explainCron('0 0 1 */2 *'), '每隔 2 个月的 1 日 00:00 执行一次。');
assert.strictEqual(cron.explainCron('*/5 * * * * *'), '每隔 5 秒执行一次。');
assert.strictEqual(cron.explainCron('0 * * * * *'), '每分钟整点执行。');
assert.strictEqual(cron.explainCron('0,20,40 * * * * *'), '每分钟第 0、20、40 秒执行。');
assert.strictEqual(cron.explainCron('0 0 9 * * MON-FRI'), '每周一至周五 09:00:00 执行。');
assert.strictEqual(cron.explainCron('0 0 0 L * ?'), '每月最后一天 00:00:00 执行。');
assert.strictEqual(cron.explainCron('0 0 18 LW * ?'), '每月最后一个工作日 18:00:00 执行。');
assert.strictEqual(cron.explainCron('0 0 9 ? * MON#2'), '每月第二个周一 09:00:00 执行。');

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

const [singaporeRun] = cron.getNextRuns('30 8 * * *', {
    from: new Date('2026-07-14T00:00:00Z'),
    count: 1,
    timezoneOffsetMinutes: 8 * 60
});
assert.strictEqual(singaporeRun.toISOString(), '2026-07-14T00:30:00.000Z');

const calendarRunCases = [
    {
        expression: '0 0 9 * * MON-FRI',
        from: '2026-07-10T10:00:00Z',
        expected: '2026-07-13T09:00:00.000Z'
    },
    {
        expression: '0 0 0 L * ?',
        from: '2026-07-30T00:00:00Z',
        expected: '2026-07-31T00:00:00.000Z'
    },
    {
        expression: '0 0 9 15W * ?',
        from: '2026-08-13T00:00:00Z',
        expected: '2026-08-14T09:00:00.000Z'
    },
    {
        expression: '0 0 18 LW * ?',
        from: '2026-07-30T00:00:00Z',
        expected: '2026-07-31T18:00:00.000Z'
    },
    {
        expression: '0 0 9 ? * MON#2',
        from: '2026-08-01T00:00:00Z',
        expected: '2026-08-10T09:00:00.000Z'
    },
    {
        expression: '0 0 0 29 2 ? 2028',
        from: '2027-12-31T00:00:00Z',
        expected: '2028-02-29T00:00:00.000Z'
    }
];
for (const testCase of calendarRunCases) {
    const [nextRun] = cron.getNextRuns(testCase.expression, {
        from: new Date(testCase.from),
        count: 1
    });
    assert.strictEqual(nextRun.toISOString(), testCase.expected, `unexpected next run for ${testCase.expression}`);
}

const [farFutureRun] = cron.getNextRuns('59 59 23 31 12 ? 2099', {
    from: new Date('2026-07-14T00:00:00Z'),
    count: 10
});
assert.strictEqual(farFutureRun.toISOString(), '2099-12-31T23:59:59.000Z');

assert.throws(() => cron.getNextRuns('* * *', { from: new Date(), count: 1 }), /Cron expression must have 5, 6, or 7 fields/);

const page = fs.readFileSync(path.join(root, 'cron-parser.html'), 'utf8');
assert.match(page, /<title>Cron 表达式解析与生成工具<\/title>/);
assert.match(page, /<script src="cron-parser\.js"><\/script>/);
assert.match(page, /<script src="cron-generator\.js"><\/script>/);
assert.match(page, /<span>V1\.09<\/span>/);
assert.match(page, /id="cron-explanation"/);
assert.match(page, /CronParser\.explainCron/);
assert.match(page, /<div class="changelog-date">2026年7月14日<\/div>[\s\S]*?<div class="changelog-version">V1\.09<\/div>[\s\S]*?<div class="changelog-version">V1\.08<\/div>[\s\S]*?<div class="changelog-version">V1\.07<\/div>[\s\S]*?<div class="changelog-version">V1\.06<\/div>[\s\S]*?<div class="changelog-version">V1\.05<\/div>[\s\S]*?<div class="changelog-version">V1\.04<\/div>[\s\S]*?<div class="changelog-version">V1\.03<\/div>[\s\S]*?<div class="changelog-version">V1\.02<\/div>[\s\S]*?<div class="changelog-date">2026年7月13日<\/div>[\s\S]*?<div class="changelog-version">V1\.01<\/div>/);
assert.match(page, /支持月份和星期英文缩写，以及 Quartz 的 \?、L、W、LW、# 语法/);
assert.match(page, /Spring \/ Quartz 6 段/);
assert.match(page, /id="schedule-hour-label"/);
assert.match(page, /type === 'hour-interval' \? '起始小时' : '小时'/);
assert.match(page, /id="timezone-label"/);
assert.match(page, /function formatDateTime\(date\)/);
assert.doesNotMatch(page, /date\.toLocaleString\(\).*date\.toISOString\(\)/);
assert.match(page, /<div class="changelog-date">2026年7月11日<\/div>[\s\S]*?<div class="changelog-version">V1\.00<\/div>/);
assert.match(page, /id="cron-input"/);
assert.match(page, /id="count-input"/);
assert.match(page, /<label for="count-input">最近执行时间条目数<\/label>/);
assert.match(page, /id="count-input"[^>]*value="5"/);
assert.match(page, /timezoneOffsetMinutes: currentTimezoneOffsetMinutes/);
assert.match(page, /id="result-list"/);
assert.match(page, /CronParser\.getNextRuns/);
assert.match(page, /id="generator-tab"/);
assert.match(page, /id="schedule-type"/);
assert.match(page, /id="generator-results"/);
assert.match(page, /CronGenerator\.generateCron/);

const nav = fs.readFileSync(path.join(root, 'nav.js'), 'utf8');
const home = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
const development = fs.readFileSync(path.join(root, 'DEVELOPMENT.md'), 'utf8');
assert.match(nav, /name: 'Cron 解析', path: 'cron-parser\.html'/);
assert.match(home, /href="cron-parser\.html"/);
assert.match(readme, /cron-parser\.html/);
assert.match(development, /cron-parser\.html/);

console.log('cron parser behavior passed');
