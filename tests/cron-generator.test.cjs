const assert = require('node:assert');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const generator = require(path.join(root, 'cron-generator.js'));
const parser = require(path.join(root, 'cron-parser.js'));

const cases = [
    {
        config: { type: 'every-minute', second: 0 },
        description: '每分钟执行一次。',
        expressions: ['* * * * *', '0 * * * * *', '0 * * * * ?', '0 * * * * ? *']
    },
    {
        config: { type: 'minute-interval', interval: 15, second: 0 },
        description: '每隔 15 分钟执行一次。',
        expressions: ['*/15 * * * *', '0 */15 * * * *', '0 0/15 * * * ?', '0 0/15 * * * ? *']
    },
    {
        config: { type: 'hourly', minute: 30, second: 0 },
        description: '每小时第 30 分钟执行。',
        expressions: ['30 * * * *', '0 30 * * * *', '0 30 * * * ?', '0 30 * * * ? *']
    },
    {
        config: { type: 'hour-interval', interval: 3, second: 0 },
        description: '每隔 3 小时整点执行一次。',
        expressions: ['0 */3 * * *', '0 0 */3 * * *', '0 0 0/3 * * ?', '0 0 0/3 * * ? *']
    },
    {
        config: { type: 'daily', hour: 9, minute: 30, second: 0 },
        description: '每天 09:30 执行。',
        expressions: ['30 9 * * *', '0 30 9 * * *', '0 30 9 * * ?', '0 30 9 * * ? *']
    },
    {
        config: { type: 'weekly', hour: 9, minute: 0, second: 0, weekdays: ['MON', 'FRI'] },
        description: '每周一、周五 09:00 执行。',
        expressions: ['0 9 * * 1,5', '0 0 9 * * MON,FRI', '0 0 9 ? * MON,FRI', '0 0 9 ? * MON,FRI *']
    },
    {
        config: { type: 'monthly', day: 15, hour: 18, minute: 20, second: 0 },
        description: '每月 15 日 18:20 执行。',
        expressions: ['20 18 15 * *', '0 20 18 15 * *', '0 20 18 15 * ?', '0 20 18 15 * ? *']
    },
    {
        config: { type: 'yearly', month: 7, day: 14, hour: 8, minute: 5, second: 0 },
        description: '每年 7 月 14 日 08:05 执行。',
        expressions: ['5 8 14 7 *', '0 5 8 14 7 *', '0 5 8 14 7 ?', '0 5 8 14 7 ? *']
    }
];

for (const testCase of cases) {
    const result = generator.generateCron(testCase.config);
    assert.strictEqual(result.description, testCase.description);
    assert.deepStrictEqual(result.formats.map(item => item.expression), testCase.expressions);
    for (const format of result.formats) {
        assert.strictEqual(format.supported, true);
        assert.doesNotThrow(() => parser.parseCron(format.expression), `${format.label}: ${format.expression}`);
    }
}

const secondPrecision = generator.generateCron({ type: 'daily', hour: 9, minute: 30, second: 15 });
assert.strictEqual(secondPrecision.formats[0].supported, false);
assert.match(secondPrecision.formats[0].reason, /秒级/);
assert.deepStrictEqual(
    secondPrecision.formats.slice(1).map(item => item.expression),
    ['15 30 9 * * *', '15 30 9 * * ?', '15 30 9 * * ? *']
);

assert.throws(() => generator.generateCron({ type: 'minute-interval', interval: 0 }), /间隔/);
assert.throws(() => generator.generateCron({ type: 'weekly', weekdays: [] }), /星期/);
assert.throws(() => generator.generateCron({ type: 'yearly', month: 2, day: 30 }), /日期/);

console.log('cron generator behavior passed');
