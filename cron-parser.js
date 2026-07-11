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
        matches,
        getNextRuns,
    };
});
