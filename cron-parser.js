(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }
    root.CronParser = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    function detectCronType(expression) {
        const fields = String(expression ?? '').trim().split(/\s+/).filter(Boolean).length;
        if (![5, 6, 7].includes(fields)) {
            throw new Error('Cron expression must have 5, 6, or 7 fields');
        }
        return { type: fields === 5 ? 'linux' : 'quartz', fields };
    }

    function expandRange(part, min, max, name) {
        const [range, stepText] = part.split('/');
        const step = stepText === undefined ? 1 : Number(stepText);
        if (!Number.isInteger(step) || step <= 0) {
            throw new Error(`${name} step must be positive`);
        }

        let start;
        let end;
        if (range === '*' || range === '?') {
            start = min;
            end = max;
        } else if (range.includes('-')) {
            const [startText, endText] = range.split('-');
            start = Number(startText);
            end = Number(endText);
        } else {
            start = Number(range);
            end = stepText === undefined ? start : max;
        }

        if (!Number.isInteger(start) || !Number.isInteger(end) || start < min || end > max || start > end) {
            throw new Error(`${name} out of range`);
        }

        const values = [];
        for (let value = start; value <= end; value += step) {
            values.push(value);
        }
        return values;
    }

    function parseField(source, min, max, name) {
        const field = String(source ?? '').trim();
        if (!field) {
            throw new Error(`${name} is empty`);
        }
        const values = new Set();
        for (const part of field.split(',')) {
            expandRange(part, min, max, name).forEach((value) => values.add(value));
        }
        return [...values].sort((a, b) => a - b);
    }

    function parseCron(expression) {
        const parts = String(expression ?? '').trim().split(/\s+/).filter(Boolean);
        const { type } = detectCronType(expression);
        const offset = type === 'linux' ? 0 : 1;
        const secondValues = type === 'linux' ? [0] : parseField(parts[0], 0, 59, 'second');
        const minuteValues = parseField(parts[offset], 0, 59, 'minute');
        const hourValues = parseField(parts[offset + 1], 0, 23, 'hour');
        const dayValues = parseField(parts[offset + 2], 1, 31, 'day');
        const monthValues = parseField(parts[offset + 3], 1, 12, 'month');
        const weekValues = parseField(parts[offset + 4], 0, 7, 'week').map((value) => value === 7 ? 0 : value);
        const yearValues = parts.length === 7 ? parseField(parts[6], 1970, 2099, 'year') : null;
        return { type, secondValues, minuteValues, hourValues, dayValues, monthValues, weekValues, yearValues };
    }

    function explainCron(expression) {
        const parts = String(expression ?? '').trim().split(/\s+/).filter(Boolean);
        const { type } = detectCronType(expression);
        parseCron(expression);

        const fields = type === 'linux'
            ? { second: '0', minute: parts[0], hour: parts[1], day: parts[2], month: parts[3], week: parts[4], year: '*' }
            : { second: parts[0], minute: parts[1], hour: parts[2], day: parts[3], month: parts[4], week: parts[5], year: parts[6] || '*' };
        const isAny = (value) => value === '*' || value === '?';
        const isNumber = (value) => /^\d+$/.test(value);
        const pad = (value) => String(value).padStart(2, '0');
        const fixedTime = isNumber(fields.second) && isNumber(fields.minute) && isNumber(fields.hour);
        const timeText = fixedTime ? `${pad(fields.hour)}:${pad(fields.minute)}:${pad(fields.second)}` : '';

        const minuteInterval = fields.minute.match(/^\*\/(\d+)$/);
        if (minuteInterval
            && fields.second === '0'
            && isAny(fields.hour)
            && isAny(fields.day)
            && isAny(fields.month)
            && isAny(fields.week)
            && isAny(fields.year)) {
            return `每隔 ${minuteInterval[1]} 分钟执行一次。`;
        }

        if (fixedTime && isAny(fields.day) && isAny(fields.month) && isAny(fields.week) && isAny(fields.year)) {
            return `每天 ${timeText} 执行。`;
        }

        if (fixedTime && isAny(fields.day) && isAny(fields.month) && !isAny(fields.week) && isAny(fields.year)) {
            return `每${formatWeek(fields.week)} ${timeText} 执行。`;
        }

        if (fixedTime
            && isNumber(fields.day)
            && isNumber(fields.month)
            && isAny(fields.week)
            && isNumber(fields.year)) {
            return `在 ${fields.year} 年 ${Number(fields.month)} 月 ${Number(fields.day)} 日 ${timeText} 执行。`;
        }

        const descriptions = [];
        if (!isAny(fields.year)) descriptions.push(`年份为 ${formatField(fields.year)}`);
        if (!isAny(fields.month)) descriptions.push(`月份为 ${formatField(fields.month)}`);
        if (!isAny(fields.day)) descriptions.push(`日期为 ${formatField(fields.day)}`);
        if (!isAny(fields.week)) descriptions.push(`星期为 ${formatWeek(fields.week).replace(/^周/, '')}`);
        if (!isAny(fields.hour)) descriptions.push(`小时为 ${formatField(fields.hour)}`);
        if (!isAny(fields.minute)) descriptions.push(`分钟为 ${formatField(fields.minute)}`);
        if (type === 'quartz' && !isAny(fields.second)) descriptions.push(`秒为 ${formatField(fields.second)}`);
        return descriptions.length
            ? `在${descriptions.join('，')}时执行。`
            : type === 'linux' ? '每分钟执行一次。' : '每秒执行一次。';
    }

    function formatField(source) {
        return source.split(',').map((part) => {
            const stepMatch = part.match(/^(\*|\d+)-(\d+)\/(\d+)$/);
            if (stepMatch) return `${stepMatch[1]} 至 ${stepMatch[2]}之间每隔 ${stepMatch[3]}`;
            const simpleStep = part.match(/^(\*|\d+)\/(\d+)$/);
            if (simpleStep) return simpleStep[1] === '*' ? `每隔 ${simpleStep[2]}` : `从 ${simpleStep[1]} 开始每隔 ${simpleStep[2]}`;
            const range = part.match(/^(\d+)-(\d+)$/);
            return range ? `${range[1]} 至 ${range[2]}` : part;
        }).join('、');
    }

    function formatWeek(source) {
        const names = ['周日', '周一', '周二', '周三', '周四', '周五', '周六', '周日'];
        return source.split(',').map((part) => {
            const range = part.match(/^(\d+)-(\d+)$/);
            if (range) return `${names[Number(range[1])] || range[1]}至${names[Number(range[2])] || range[2]}`;
            return names[Number(part)] || formatField(part);
        }).join('、');
    }

    function matches(date, parsed) {
        return parsed.secondValues.includes(date.getUTCSeconds())
            && parsed.minuteValues.includes(date.getUTCMinutes())
            && parsed.hourValues.includes(date.getUTCHours())
            && parsed.dayValues.includes(date.getUTCDate())
            && parsed.monthValues.includes(date.getUTCMonth() + 1)
            && parsed.weekValues.includes(date.getUTCDay())
            && (!parsed.yearValues || parsed.yearValues.includes(date.getUTCFullYear()));
    }

    function getNextRuns(expression, options = {}) {
        const parsed = parseCron(expression);
        const count = Number(options.count ?? 5);
        if (!Number.isInteger(count) || count <= 0) {
            throw new Error('count must be positive');
        }
        const stepMs = parsed.type === 'linux' ? 60 * 1000 : 1000;
        let cursor = new Date((options.from ? new Date(options.from) : new Date()).getTime() + stepMs);
        if (parsed.type === 'linux') {
            cursor.setUTCSeconds(0, 0);
        } else {
            cursor.setUTCMilliseconds(0);
        }

        const result = [];
        const maxIterations = parsed.type === 'linux' ? 366 * 24 * 60 * 5 : 366 * 24 * 60 * 60;
        for (let index = 0; index < maxIterations && result.length < count; index += 1) {
            if (matches(cursor, parsed)) {
                result.push(new Date(cursor));
            }
            cursor = new Date(cursor.getTime() + stepMs);
        }
        if (result.length < count) {
            throw new Error('No enough future runs found in search window');
        }
        return result;
    }

    return {
        detectCronType,
        parseField,
        parseCron,
        explainCron,
        matches,
        getNextRuns,
    };
});
