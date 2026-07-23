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

const linuxVisualization = cron.visualizeCron('*/15 9-18 * * MON-FRI');
assert.strictEqual(linuxVisualization.typeLabel, 'Linux 5 段');
assert.deepStrictEqual(
    linuxVisualization.fields.map(field => [field.position, field.label, field.value]),
    [
        [1, '分钟', '*/15'],
        [2, '小时', '9-18'],
        [3, '日期', '*'],
        [4, '月份', '*'],
        [5, '星期', 'MON-FRI']
    ]
);
assert.strictEqual(linuxVisualization.fields[0].meaning, '每小时的第 0、15、30、45 分钟（每隔 15 分钟）');
assert.strictEqual(linuxVisualization.fields[1].meaning, '小时范围：9 至 18');
assert.strictEqual(linuxVisualization.fields[2].meaning, '每个月的每一天都生效');
assert.strictEqual(linuxVisualization.fields[3].meaning, '一年中的每个月都生效');
assert.strictEqual(linuxVisualization.fields[4].meaning, '星期范围：周一至周五');
const wildcardVisualization = cron.visualizeCron('* * * * *');
assert.strictEqual(wildcardVisualization.fields[0].meaning, '每小时的每一分钟都生效');
assert.strictEqual(wildcardVisualization.fields[1].meaning, '每天的每个小时都生效');
assert.strictEqual(wildcardVisualization.fields[2].meaning, '每个月的每一天都生效');
assert.strictEqual(wildcardVisualization.fields[3].meaning, '一年中的每个月都生效');
assert.strictEqual(wildcardVisualization.fields[4].meaning, '一周中的每一天都生效，不限制星期');
assert.strictEqual(
    cron.visualizeCron('*/30 * * * *').fields[0].meaning,
    '每小时的第 0、30 分钟（每隔 30 分钟）'
);
assert.deepStrictEqual(
    cron.visualizeCron('*/30 * * * *').fields[0].syntaxParts,
    [
        { token: '*', role: '斜杠左侧', description: '表示使用分钟的完整范围（0-59），起点为 0' },
        { token: '/', role: '步进运算符', description: '表示从左侧起点或范围内，按固定间隔依次取值' },
        { token: '30', role: '斜杠右侧', description: '表示每次前进 30 分钟' }
    ]
);
assert.strictEqual(
    cron.visualizeCron('0 18 0/3 * * ?').fields[2].meaning,
    '每天的 0、3、6、9、12、15、18、21 点（从 0 开始每隔 3 小时）'
);
assert.deepStrictEqual(
    cron.visualizeCron('0 18 0/3 * * ?').fields[2].syntaxParts,
    [
        { token: '0', role: '斜杠左侧', description: '表示从 0 这个小时位置开始' },
        { token: '/', role: '步进运算符', description: '表示从左侧起点或范围内，按固定间隔依次取值' },
        { token: '3', role: '斜杠右侧', description: '表示每次前进 3 小时' }
    ]
);
assert.deepStrictEqual(
    cron.visualizeCron('0 9-18/3 * * *').fields[1].syntaxParts,
    [
        { token: '9-18', role: '斜杠左侧', description: '表示只在 9 至 18 这个小时范围内取值' },
        { token: '/', role: '步进运算符', description: '表示从左侧起点或范围内，按固定间隔依次取值' },
        { token: '3', role: '斜杠右侧', description: '表示每次前进 3 小时' }
    ]
);
assert.deepStrictEqual(cron.visualizeCron('0 9 * * *').fields[1].syntaxParts, []);

const quartzVisualization = cron.visualizeCron('0 30 9 ? JAN MON#2 2027');
assert.strictEqual(quartzVisualization.typeLabel, 'Quartz 7 段');
assert.deepStrictEqual(
    quartzVisualization.fields.map(field => field.label),
    ['秒', '分钟', '小时', '日期', '月份', '星期', '年份']
);
assert.strictEqual(quartzVisualization.fields[3].meaning, '这一位不限制日期，由日期和星期中的另一项决定');
assert.strictEqual(quartzVisualization.fields[5].meaning, '当月第二个周一');
assert.strictEqual(quartzVisualization.fields[6].range, '1970-2099');
const springVisualization = cron.visualizeCron('0 */5 * * * ?');
assert.strictEqual(springVisualization.typeLabel, 'Spring / Quartz 6 段');
assert.deepStrictEqual(
    springVisualization.fields.map(field => field.label),
    ['秒', '分钟', '小时', '日期', '月份', '星期']
);
assert.throws(() => cron.visualizeCron('* * *'), /Cron expression must have 5, 6, or 7 fields/);

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
assert.match(page, /<span>V1\.13<\/span>/);
assert.match(page, /id="cron-explanation"/);
assert.match(page, /CronParser\.explainCron/);
assert.match(page, /id="visualize-btn"/);
assert.match(page, /id="cron-visualizer-modal"[^>]*class="modal-overlay"[^>]*role="dialog"[^>]*aria-modal="true"[^>]*aria-labelledby="cronVisualizerTitle"[^>]*aria-hidden="true"/);
assert.match(page, /class="modal-content cron-visualizer-dialog"/);
assert.match(page, /id="cronVisualizerTitle"[^>]*>Cron 表达式可视化<\/h3>/);
assert.match(page, /id="cronVisualizerSource"/);
assert.match(page, /id="cronFlowTab"[^>]*data-view="flow"[^>]*aria-selected="true"/);
assert.match(page, /id="cronFieldsTab"[^>]*data-view="fields"[^>]*aria-selected="false"/);
assert.match(page, /id="cronFlowView"[^>]*role="tabpanel"/);
assert.match(page, /id="cronFieldsView"[^>]*role="tabpanel"[^>]*hidden/);
assert.match(page, /CronParser\.visualizeCron/);
assert.match(page, /function openCronVisualizer\(\)/);
assert.match(page, /function closeCronVisualizer\(\)/);
assert.match(page, /function selectCronField\(position\)/);
assert.match(page, /class="cron-flow-node"[^>]*data-cron-position/);
assert.match(page, /class="cron-source-token"[^>]*data-cron-position/);
assert.match(page, /第 \$\{field\.position\} 位/);
assert.match(page, /可用范围：\$\{escapeHtml\(field\.range\)\}/);
assert.match(page, /class="cron-step-title">\$\{escapeHtml\(field\.value\)\} 写法拆解/);
assert.match(page, /class="cron-step-role">\$\{escapeHtml\(part\.role\)\}/);
assert.match(page, /\.modal-content\.cron-visualizer-dialog\s*\{[\s\S]*?width:\s*min\(1280px,\s*calc\(100vw - 48px\)\)[\s\S]*?max-height:\s*calc\(100vh - 48px\)/);
assert.match(page, /<div class="changelog-date">2026年7月24日<\/div>[\s\S]*?<div class="changelog-version">V1\.13<\/div>[\s\S]*?<div class="changelog-version">V1\.12<\/div>[\s\S]*?<div class="changelog-version">V1\.11<\/div>/);
assert.match(page, /<div class="changelog-date">2026年7月23日<\/div>[\s\S]*?<div class="changelog-version">V1\.10<\/div>/);
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
