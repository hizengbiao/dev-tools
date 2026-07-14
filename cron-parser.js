(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }
    root.CronParser = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    const MONTH_ALIASES = { JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6, JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12 };
    const WEEK_ALIASES = { SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6 };

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

    function normalizeAliases(source, name) {
        const aliases = name === 'month' ? MONTH_ALIASES : name === 'week' ? WEEK_ALIASES : null;
        if (!aliases) return String(source ?? '').trim();
        return String(source ?? '').trim().toUpperCase().replace(/[A-Z]{3}/g, (alias) => {
            if (!(alias in aliases)) throw new Error(`${name} alias is invalid`);
            return String(aliases[alias]);
        });
    }

    function parseField(source, min, max, name) {
        const field = normalizeAliases(source, name);
        if (!field) {
            throw new Error(`${name} is empty`);
        }
        const values = new Set();
        for (const part of field.split(',')) {
            expandRange(part, min, max, name).forEach((value) => values.add(value));
        }
        return [...values].sort((a, b) => a - b);
    }

    function parseDayField(source) {
        const field = String(source ?? '').trim().toUpperCase();
        const any = field === '*' || field === '?';
        if (any) {
            return { values: parseField(field, 1, 31, 'day'), any: true, special: null };
        }
        if (field === 'L') return { values: [], any: false, special: { type: 'last-day' } };
        if (field === 'LW') return { values: [], any: false, special: { type: 'last-weekday' } };

        const nearestWeekday = field.match(/^(\d+)W$/);
        if (nearestWeekday) {
            const day = Number(nearestWeekday[1]);
            if (day < 1 || day > 31) throw new Error('day weekday target out of range');
            return { values: [], any: false, special: { type: 'nearest-weekday', day } };
        }
        if (/[LW#]/.test(field)) throw new Error('day special syntax is invalid');
        return { values: parseField(field, 1, 31, 'day'), any: false, special: null };
    }

    function parseWeekField(source) {
        const rawField = String(source ?? '').trim().toUpperCase();
        const any = rawField === '*' || rawField === '?';
        if (any) {
            return {
                values: parseField(rawField, 0, 7, 'week').map(value => value === 7 ? 0 : value),
                any: true,
                special: null
            };
        }

        const field = normalizeAliases(rawField, 'week');
        const nthWeekday = field.match(/^(\d+)#(\d+)$/);
        if (nthWeekday) {
            const weekday = Number(nthWeekday[1]);
            const nth = Number(nthWeekday[2]);
            if (weekday < 0 || weekday > 7 || nth < 1 || nth > 5) throw new Error('week nth target out of range');
            return { values: [], any: false, special: { type: 'nth-weekday', weekday: weekday === 7 ? 0 : weekday, nth } };
        }

        const lastWeekday = field.match(/^(\d+)L$/);
        if (lastWeekday) {
            const weekday = Number(lastWeekday[1]);
            if (weekday < 0 || weekday > 7) throw new Error('week last target out of range');
            return { values: [], any: false, special: { type: 'last-weekday-of-month', weekday: weekday === 7 ? 0 : weekday } };
        }
        if (/[LW#]/.test(field)) throw new Error('week special syntax is invalid');
        return {
            values: parseField(field, 0, 7, 'week').map(value => value === 7 ? 0 : value),
            any: false,
            special: null
        };
    }

    function daysInMonth(year, month) {
        return new Date(Date.UTC(year, month, 0)).getUTCDate();
    }

    function validatePossibleCalendarDate(dayField, monthValues, yearValues, weekField, type) {
        if (dayField.any || dayField.special || !dayField.values.length) return;
        if (type === 'linux' && !weekField.any) return;
        const candidateYears = yearValues && yearValues.length ? yearValues : [2028];
        const hasPossibleDate = candidateYears.some(year => monthValues.some(month =>
            dayField.values.some(day => day <= daysInMonth(year, month))
        ));
        if (!hasPossibleDate) throw new Error('day does not exist in selected month or year');
    }

    function parseCron(expression) {
        const parts = String(expression ?? '').trim().split(/\s+/).filter(Boolean);
        const { type } = detectCronType(expression);
        const offset = type === 'linux' ? 0 : 1;
        const secondValues = type === 'linux' ? [0] : parseField(parts[0], 0, 59, 'second');
        const minuteValues = parseField(parts[offset], 0, 59, 'minute');
        const hourValues = parseField(parts[offset + 1], 0, 23, 'hour');
        const dayField = parseDayField(parts[offset + 2]);
        const monthValues = parseField(parts[offset + 3], 1, 12, 'month');
        const weekField = parseWeekField(parts[offset + 4]);
        const yearValues = parts.length === 7 ? parseField(parts[6], 1970, 2099, 'year') : null;
        if (type === 'quartz' && parts[offset + 2] === '?' && parts[offset + 4] === '?') {
            throw new Error('day and week cannot both be unspecified');
        }
        validatePossibleCalendarDate(dayField, monthValues, yearValues, weekField, type);
        return {
            type,
            secondValues,
            minuteValues,
            hourValues,
            dayValues: dayField.values,
            monthValues,
            weekValues: weekField.values,
            yearValues,
            dayAny: dayField.any,
            weekAny: weekField.any,
            daySpecial: dayField.special,
            weekSpecial: weekField.special
        };
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
        const timeText = fixedTime
            ? type === 'linux'
                ? `${pad(fields.hour)}:${pad(fields.minute)}`
                : `${pad(fields.hour)}:${pad(fields.minute)}:${pad(fields.second)}`
            : '';
        const unrestrictedCalendar = isAny(fields.day)
            && isAny(fields.month)
            && isAny(fields.week)
            && isAny(fields.year);

        const secondInterval = fields.second.match(/^(?:\*|0)\/(\d+)$/);
        if (type === 'quartz'
            && secondInterval
            && isAny(fields.minute)
            && isAny(fields.hour)
            && unrestrictedCalendar) {
            return `每隔 ${secondInterval[1]} 秒执行一次。`;
        }

        const explicitSecondList = /^\d+(?:,\d+)+$/.test(fields.second);
        if (type === 'quartz'
            && explicitSecondList
            && isAny(fields.minute)
            && isAny(fields.hour)
            && unrestrictedCalendar) {
            return `每分钟第 ${formatField(fields.second)} 秒执行。`;
        }

        if (type === 'quartz'
            && isNumber(fields.second)
            && isAny(fields.minute)
            && isAny(fields.hour)
            && unrestrictedCalendar) {
            return Number(fields.second) === 0
                ? '每分钟整点执行。'
                : `每分钟第 ${Number(fields.second)} 秒执行。`;
        }

        const minuteInterval = fields.minute.match(/^(?:\*|0)\/(\d+)$/);
        if (minuteInterval
            && fields.second === '0'
            && isAny(fields.hour)
            && isAny(fields.day)
            && isAny(fields.month)
            && isAny(fields.week)
            && isAny(fields.year)) {
            return `每隔 ${minuteInterval[1]} 分钟执行一次。`;
        }

        const explicitMinuteList = /^\d+(?:,\d+)+$/.test(fields.minute);
        const minuteRange = fields.minute.match(/^(\d+)-(\d+)$/);
        if (unrestrictedCalendar && fields.second === '0' && isAny(fields.hour) && explicitMinuteList) {
            return `每小时第 ${formatField(fields.minute)} 分钟执行。`;
        }
        if (unrestrictedCalendar && fields.second === '0' && isAny(fields.hour) && minuteRange) {
            return `每小时第 ${minuteRange[1]} 至 ${minuteRange[2]} 分钟内每分钟执行。`;
        }

        if (unrestrictedCalendar && isAny(fields.hour) && isNumber(fields.minute) && isNumber(fields.second)) {
            const minute = Number(fields.minute);
            const second = Number(fields.second);
            if (minute === 0 && second === 0) return '每小时整点执行。';
            if (second === 0) return `每小时第 ${minute} 分钟执行。`;
            return `每小时第 ${minute} 分 ${second} 秒执行。`;
        }

        const hourInterval = fields.hour.match(/^\*\/(\d+)$/);
        if (unrestrictedCalendar && hourInterval && isNumber(fields.minute) && isNumber(fields.second)) {
            const minute = Number(fields.minute);
            const second = Number(fields.second);
            if (minute === 0 && second === 0) return `每隔 ${hourInterval[1]} 小时整点执行一次。`;
            if (second === 0) return `每隔 ${hourInterval[1]} 小时，在第 ${minute} 分钟执行一次。`;
            return `每隔 ${hourInterval[1]} 小时，在第 ${minute} 分 ${second} 秒执行一次。`;
        }

        const startedHourInterval = fields.hour.match(/^(\d+)\/(\d+)$/);
        if (unrestrictedCalendar && startedHourInterval && isNumber(fields.minute) && isNumber(fields.second)) {
            const startHour = Number(startedHourInterval[1]);
            const interval = Number(startedHourInterval[2]);
            const startTime = type === 'linux'
                ? `${pad(startHour)}:${pad(fields.minute)}`
                : `${pad(startHour)}:${pad(fields.minute)}${Number(fields.second) ? `:${pad(fields.second)}` : ''}`;
            return `每天从 ${startTime} 开始，每隔 ${interval} 小时执行一次。`;
        }

        if (fixedTime && fields.day === 'L' && isAny(fields.month) && isAny(fields.week) && isAny(fields.year)) {
            return `每月最后一天 ${timeText} 执行。`;
        }

        if (fixedTime && fields.day === 'LW' && isAny(fields.month) && isAny(fields.week) && isAny(fields.year)) {
            return `每月最后一个工作日 ${timeText} 执行。`;
        }

        const nearestWeekday = fields.day.match(/^(\d+)W$/i);
        if (fixedTime && nearestWeekday && isAny(fields.month) && isAny(fields.week) && isAny(fields.year)) {
            return `每月最接近 ${Number(nearestWeekday[1])} 日的工作日 ${timeText} 执行。`;
        }

        const nthWeekday = fields.week.match(/^([A-Z]{3}|\d+)#([1-5])$/i);
        if (fixedTime && nthWeekday && isAny(fields.day) && isAny(fields.month) && isAny(fields.year)) {
            return `每月第${formatOrdinal(Number(nthWeekday[2]))}个${formatWeekdayToken(nthWeekday[1])} ${timeText} 执行。`;
        }

        const lastWeekday = fields.week.match(/^([A-Z]{3}|\d+)L$/i);
        if (fixedTime && lastWeekday && isAny(fields.day) && isAny(fields.month) && isAny(fields.year)) {
            return `每月最后一个${formatWeekdayToken(lastWeekday[1])} ${timeText} 执行。`;
        }

        if (fixedTime && isNumber(fields.day) && isAny(fields.month) && isAny(fields.week) && isAny(fields.year)) {
            return `每月 ${Number(fields.day)} 日 ${timeText} 执行。`;
        }

        const explicitDayList = /^\d+(?:,\d+)+$/.test(fields.day);
        if (fixedTime && explicitDayList && isAny(fields.month) && isAny(fields.week) && isAny(fields.year)) {
            return `每月 ${formatField(fields.day)} 日 ${timeText} 执行。`;
        }

        const dayInterval = fields.day.match(/^(?:\*|1)\/(\d+)$/);
        if (fixedTime && dayInterval && isAny(fields.month) && isAny(fields.week) && isAny(fields.year)) {
            return `每隔 ${dayInterval[1]} 天在 ${timeText} 执行一次。`;
        }

        const monthInterval = fields.month.match(/^(?:\*|1)\/(\d+)$/);
        if (fixedTime && isNumber(fields.day) && monthInterval && isAny(fields.week) && isAny(fields.year)) {
            return `每隔 ${monthInterval[1]} 个月的 ${Number(fields.day)} 日 ${timeText} 执行一次。`;
        }

        if (fixedTime && isNumber(fields.day) && !isAny(fields.month) && isAny(fields.week) && isAny(fields.year)) {
            return `每年 ${formatMonth(fields.month)} 月 ${Number(fields.day)} 日 ${timeText} 执行。`;
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
            return `在 ${fields.year} 年 ${Number(normalizeAliases(fields.month, 'month'))} 月 ${Number(fields.day)} 日 ${timeText} 执行。`;
        }

        const explicitMinutes = /^\d+(?:,\d+)*$/.test(fields.minute);
        const explicitHours = /^\d+(?:-\d+)?(?:,\d+(?:-\d+)?)*$/.test(fields.hour);
        if (unrestrictedCalendar
            && fields.second === '0'
            && explicitMinutes
            && explicitHours
            && !isNumber(fields.hour)) {
            if (fields.minute === '0') return `每天在 ${formatField(fields.hour)} 点整点执行。`;
            return `每天在 ${formatField(fields.hour)} 点的第 ${formatField(fields.minute)} 分钟执行。`;
        }

        if (fields.second === '0'
            && fields.minute === '0'
            && explicitHours
            && !isAny(fields.week)
            && isAny(fields.day)
            && isAny(fields.month)
            && isAny(fields.year)) {
            return `每${formatWeek(fields.week)}，在 ${formatField(fields.hour)} 点整点执行。`;
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

    function formatMonth(source) {
        return formatField(normalizeAliases(source, 'month'));
    }

    function formatOrdinal(value) {
        return ['零', '一', '二', '三', '四', '五'][value] || String(value);
    }

    function formatWeekdayToken(source) {
        const names = ['周日', '周一', '周二', '周三', '周四', '周五', '周六', '周日'];
        const normalized = normalizeAliases(source, 'week');
        return names[Number(normalized)] || source;
    }

    function formatWeek(source) {
        const names = ['周日', '周一', '周二', '周三', '周四', '周五', '周六', '周日'];
        return normalizeAliases(source, 'week').split(',').map((part) => {
            const range = part.match(/^(\d+)-(\d+)$/);
            if (range) return `${names[Number(range[1])] || range[1]}至${names[Number(range[2])] || range[2]}`;
            return names[Number(part)] || formatField(part);
        }).join('、');
    }

    function nearestWeekdayOfMonth(year, month, targetDay) {
        const lastDay = daysInMonth(year, month);
        if (targetDay > lastDay) return null;
        const weekday = new Date(Date.UTC(year, month - 1, targetDay)).getUTCDay();
        if (weekday === 6) return targetDay === 1 ? 3 : targetDay - 1;
        if (weekday === 0) return targetDay === lastDay ? targetDay - 2 : targetDay + 1;
        return targetDay;
    }

    function matchesDaySpecial(date, special) {
        if (!special) return false;
        const year = date.getUTCFullYear();
        const month = date.getUTCMonth() + 1;
        const day = date.getUTCDate();
        const lastDay = daysInMonth(year, month);
        if (special.type === 'last-day') return day === lastDay;
        if (special.type === 'nearest-weekday') return day === nearestWeekdayOfMonth(year, month, special.day);
        if (special.type === 'last-weekday') {
            let target = lastDay;
            while ([0, 6].includes(new Date(Date.UTC(year, month - 1, target)).getUTCDay())) target -= 1;
            return day === target;
        }
        return false;
    }

    function matchesWeekSpecial(date, special) {
        if (!special || date.getUTCDay() !== special.weekday) return false;
        const day = date.getUTCDate();
        if (special.type === 'nth-weekday') return Math.floor((day - 1) / 7) + 1 === special.nth;
        if (special.type === 'last-weekday-of-month') {
            return day + 7 > daysInMonth(date.getUTCFullYear(), date.getUTCMonth() + 1);
        }
        return false;
    }

    function matches(date, parsed) {
        const basicFieldsMatch = parsed.secondValues.includes(date.getUTCSeconds())
            && parsed.minuteValues.includes(date.getUTCMinutes())
            && parsed.hourValues.includes(date.getUTCHours())
            && parsed.monthValues.includes(date.getUTCMonth() + 1)
            && (!parsed.yearValues || parsed.yearValues.includes(date.getUTCFullYear()));
        if (!basicFieldsMatch) return false;

        const dayMatches = parsed.daySpecial
            ? matchesDaySpecial(date, parsed.daySpecial)
            : parsed.dayValues.includes(date.getUTCDate());
        const weekMatches = parsed.weekSpecial
            ? matchesWeekSpecial(date, parsed.weekSpecial)
            : parsed.weekValues.includes(date.getUTCDay());
        if (parsed.dayAny && parsed.weekAny) return true;
        if (parsed.dayAny) return weekMatches;
        if (parsed.weekAny) return dayMatches;
        return parsed.type === 'linux' ? dayMatches || weekMatches : dayMatches && weekMatches;
    }

    function getNextRuns(expression, options = {}) {
        const parsed = parseCron(expression);
        const count = Number(options.count ?? 5);
        if (!Number.isInteger(count) || count <= 0) {
            throw new Error('count must be positive');
        }
        const timezoneOffsetMinutes = Number(options.timezoneOffsetMinutes ?? 0);
        if (!Number.isFinite(timezoneOffsetMinutes) || Math.abs(timezoneOffsetMinutes) > 14 * 60) {
            throw new Error('timezone offset is invalid');
        }
        const timezoneOffsetMs = timezoneOffsetMinutes * 60 * 1000;
        const requiresSecondGranularity = parsed.type === 'quartz'
            && !(parsed.secondValues.length === 1 && parsed.secondValues[0] === 0);
        const stepMs = requiresSecondGranularity ? 1000 : 60 * 1000;
        const fromTime = (options.from ? new Date(options.from) : new Date()).getTime();
        let cursor = new Date(fromTime + timezoneOffsetMs + stepMs);
        if (!requiresSecondGranularity) {
            cursor.setUTCSeconds(0, 0);
        } else {
            cursor.setUTCMilliseconds(0);
        }

        const result = [];
        const maxYear = parsed.yearValues ? parsed.yearValues[parsed.yearValues.length - 1] : cursor.getUTCFullYear() + 100;
        const maxIterations = 5_000_000;
        for (let index = 0; index < maxIterations && result.length < count && cursor.getUTCFullYear() <= maxYear; index += 1) {
            if (parsed.yearValues && !parsed.yearValues.includes(cursor.getUTCFullYear())) {
                const nextYear = parsed.yearValues.find(year => year > cursor.getUTCFullYear());
                if (nextYear === undefined) break;
                cursor = new Date(Date.UTC(nextYear, 0, 1, 0, 0, 0));
                continue;
            }

            const currentMonth = cursor.getUTCMonth() + 1;
            if (!parsed.monthValues.includes(currentMonth)) {
                const nextMonth = parsed.monthValues.find(month => month > currentMonth);
                if (nextMonth !== undefined) {
                    cursor = new Date(Date.UTC(cursor.getUTCFullYear(), nextMonth - 1, 1, 0, 0, 0));
                } else {
                    cursor = new Date(Date.UTC(cursor.getUTCFullYear() + 1, parsed.monthValues[0] - 1, 1, 0, 0, 0));
                }
                continue;
            }

            const dayMatches = parsed.daySpecial
                ? matchesDaySpecial(cursor, parsed.daySpecial)
                : parsed.dayValues.includes(cursor.getUTCDate());
            const weekMatches = parsed.weekSpecial
                ? matchesWeekSpecial(cursor, parsed.weekSpecial)
                : parsed.weekValues.includes(cursor.getUTCDay());
            let calendarMatches;
            if (parsed.dayAny && parsed.weekAny) calendarMatches = true;
            else if (parsed.dayAny) calendarMatches = weekMatches;
            else if (parsed.weekAny) calendarMatches = dayMatches;
            else calendarMatches = parsed.type === 'linux' ? dayMatches || weekMatches : dayMatches && weekMatches;
            if (!calendarMatches) {
                cursor.setUTCDate(cursor.getUTCDate() + 1);
                cursor.setUTCHours(0, 0, 0, 0);
                continue;
            }

            if (!parsed.hourValues.includes(cursor.getUTCHours())) {
                const nextHour = parsed.hourValues.find(hour => hour > cursor.getUTCHours());
                if (nextHour !== undefined) {
                    cursor.setUTCHours(nextHour, 0, 0, 0);
                } else {
                    cursor.setUTCDate(cursor.getUTCDate() + 1);
                    cursor.setUTCHours(parsed.hourValues[0], 0, 0, 0);
                }
                continue;
            }

            if (!parsed.minuteValues.includes(cursor.getUTCMinutes())) {
                const nextMinute = parsed.minuteValues.find(minute => minute > cursor.getUTCMinutes());
                if (nextMinute !== undefined) {
                    cursor.setUTCMinutes(nextMinute, 0, 0);
                } else {
                    cursor.setUTCHours(cursor.getUTCHours() + 1, parsed.minuteValues[0], 0, 0);
                }
                continue;
            }

            if (!parsed.secondValues.includes(cursor.getUTCSeconds())) {
                const nextSecond = parsed.secondValues.find(second => second > cursor.getUTCSeconds());
                if (nextSecond !== undefined) {
                    cursor.setUTCSeconds(nextSecond, 0);
                } else {
                    cursor.setUTCMinutes(cursor.getUTCMinutes() + 1, parsed.secondValues[0], 0);
                }
                continue;
            }

            if (matches(cursor, parsed)) {
                result.push(new Date(cursor.getTime() - timezoneOffsetMs));
            }
            cursor = new Date(cursor.getTime() + stepMs);
        }
        if (!result.length) throw new Error('No future runs found in search window');
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
