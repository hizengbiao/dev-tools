const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const pagePath = path.resolve(__dirname, '../timestamp-converter.html');
const page = fs.readFileSync(pagePath, 'utf8');

assert.match(page, /<span>V1\.02<\/span>/);
assert.match(page, /<div class="changelog-date">2026年7月10日<\/div>[\s\S]*?<div class="changelog-version">V1\.02<\/div>/);
assert.match(page, /<div class="changelog-date">2026年6月26日<\/div>[\s\S]*?<div class="changelog-version">V1\.01<\/div>/);
assert.match(page, /id="tab-single"/);
assert.match(page, /id="tab-batch"/);
assert.match(page, /id="panel-single"/);
assert.match(page, /id="panel-batch"/);
assert.match(page, /id="batch-input"/);
assert.match(page, /id="batch-output"/);
assert.match(page, /id="relative-input"/);
assert.match(page, /id="relative-date-output"/);
assert.match(page, /id="relative-ts-output"/);
assert.match(page, /function switchConversionTab\(tab\)/);
assert.match(page, /function convertBatchLines\(raw, converter\)/);
assert.match(page, /function convertBatchTimestampsToDates\(raw, unit, timezone\)/);
assert.match(page, /function convertBatchDatesToTimestamps\(raw, unit, timezone\)/);
assert.match(page, /function parseRelativeTimeExpression\(value, baseDate = new Date\(\)\)/);
assert.match(page, /function convertRelativeTimeExpression\(value, unit, timezone, baseDate = new Date\(\)\)/);
assert.match(page, /function convertRelativeTime\(\)/);

function createElement(id = '') {
    return {
        id,
        value: '',
        textContent: '',
        innerHTML: '',
        style: {},
        classList: {
            add() {},
            remove() {},
            replace() {},
        },
        appendChild(child) {
            this.children = this.children || [];
            this.children.push(child);
        },
        addEventListener() {},
    };
}

const elements = new Map();
function element(id) {
    if (!elements.has(id)) {
        elements.set(id, createElement(id));
    }
    return elements.get(id);
}

const context = {
    console,
    Date,
    Intl,
    setInterval: () => 1,
    clearInterval: () => {},
    setTimeout: () => {},
    navigator: { clipboard: { writeText: () => Promise.resolve() } },
    document: {
        getElementById: element,
        createElement: () => createElement(),
    },
    window: {
        addEventListener() {},
    },
};

vm.createContext(context);
const scripts = [...page.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g)].map((match) => match[1]);
for (const script of scripts) {
    vm.runInContext(script, context);
}

const tsToDate = context.convertBatchTimestampsToDates('1710000000\nabc\n1710000001000', 's', 'UTC');
assert.equal(tsToDate.successCount, 1);
assert.equal(tsToDate.errorCount, 2);
assert.match(tsToDate.text, /1\. 2024-03-09 16:00:00/);
assert.match(tsToDate.text, /2\. 错误：无效的数字时间戳/);
assert.match(tsToDate.text, /3\. 错误：秒级时间戳长度异常，请切换为毫秒或修正输入/);

const msToDate = context.convertBatchTimestampsToDates('1710000001000', 'ms', 'UTC');
assert.equal(msToDate.successCount, 1);
assert.equal(msToDate.errorCount, 0);
assert.match(msToDate.text, /1\. 2024-03-09 16:00:01/);

const dateToTsSeconds = context.convertBatchDatesToTimestamps('2024-03-10 00:00:00\nbad date', 's', 'Asia/Shanghai');
assert.equal(dateToTsSeconds.successCount, 1);
assert.equal(dateToTsSeconds.errorCount, 1);
assert.match(dateToTsSeconds.text, /1\. 1710000000/);
assert.match(dateToTsSeconds.text, /2\. 错误：无效的日期时间格式/);

const dateToTsMs = context.convertBatchDatesToTimestamps('2024-03-09 16:00:01', 'ms', 'UTC');
assert.equal(dateToTsMs.text.trim(), '1. 1710000001000');

const baseDate = new Date(Date.UTC(2024, 2, 10, 0, 0, 0));
const minusSevenDays = context.parseRelativeTimeExpression('now-7d', baseDate);
assert.equal(minusSevenDays.ok, true);
assert.equal(minusSevenDays.date.getTime(), Date.UTC(2024, 2, 3, 0, 0, 0));
const plusThreeHours = context.parseRelativeTimeExpression('+3h', baseDate);
assert.equal(plusThreeHours.ok, true);
assert.equal(plusThreeHours.date.getTime(), Date.UTC(2024, 2, 10, 3, 0, 0));
const minusThirtyMinutes = context.parseRelativeTimeExpression('-30m', baseDate);
assert.equal(minusThirtyMinutes.ok, true);
assert.equal(minusThirtyMinutes.date.getTime(), Date.UTC(2024, 2, 9, 23, 30, 0));
assert.deepEqual(JSON.parse(JSON.stringify(context.parseRelativeTimeExpression('bad', baseDate))), {
    ok: false,
    error: '无效的相对时间表达式，请使用 now-7d、+3h、-30m 等格式'
});

assert.deepEqual(JSON.parse(JSON.stringify(context.convertRelativeTimeExpression('+3h', 's', 'UTC', baseDate))), {
    ok: true,
    dateText: '2024-03-10 03:00:00',
    timestamp: '1710039600'
});
assert.deepEqual(JSON.parse(JSON.stringify(context.convertRelativeTimeExpression('-30m', 'ms', 'UTC', baseDate))), {
    ok: true,
    dateText: '2024-03-09 23:30:00',
    timestamp: '1710027000000'
});

console.log('timestamp converter batch behavior passed');
