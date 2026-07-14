(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    root.CronGenerator = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    const WEEKDAYS = {
        MON: { linux: 1, label: '周一' },
        TUE: { linux: 2, label: '周二' },
        WED: { linux: 3, label: '周三' },
        THU: { linux: 4, label: '周四' },
        FRI: { linux: 5, label: '周五' },
        SAT: { linux: 6, label: '周六' },
        SUN: { linux: 0, label: '周日' }
    };
    const FORMAT_DEFINITIONS = [
        { id: 'linux', label: 'Linux 5 段' },
        { id: 'spring', label: 'Spring 6 段' },
        { id: 'quartz6', label: 'Quartz 6 段' },
        { id: 'quartz7', label: 'Quartz 7 段' }
    ];

    function integer(value, min, max, label, fallback) {
        const normalized = value === '' || value === undefined || value === null ? fallback : Number(value);
        if (!Number.isInteger(normalized) || normalized < min || normalized > max) {
            throw new Error(`${label}必须是 ${min} 到 ${max} 之间的整数`);
        }
        return normalized;
    }

    function formatTime(hour, minute, second) {
        const pad = value => String(value).padStart(2, '0');
        return second ? `${pad(hour)}:${pad(minute)}:${pad(second)}` : `${pad(hour)}:${pad(minute)}`;
    }

    function validateCalendarDate(month, day) {
        const maxDay = new Date(Date.UTC(2028, month, 0)).getUTCDate();
        if (day > maxDay) throw new Error('所选月份不存在该日期');
    }

    function generateCron(source = {}) {
        const type = String(source.type || 'daily');
        const second = integer(source.second, 0, 59, '秒', 0);
        let hour = integer(source.hour, 0, 23, '小时', 0);
        let minute = integer(source.minute, 0, 59, '分钟', 0);
        let description;
        let expressions;

        if (type === 'every-minute') {
            description = second ? `每分钟第 ${second} 秒执行。` : '每分钟执行一次。';
            expressions = ['* * * * *', `${second} * * * * *`, `${second} * * * * ?`, `${second} * * * * ? *`];
        } else if (type === 'minute-interval') {
            const interval = integer(source.interval, 1, 59, '分钟间隔', 5);
            description = `每隔 ${interval} 分钟执行一次。`;
            expressions = [`*/${interval} * * * *`, `${second} */${interval} * * * *`, `${second} 0/${interval} * * * ?`, `${second} 0/${interval} * * * ? *`];
        } else if (type === 'hourly') {
            description = second
                ? `每小时第 ${minute} 分 ${second} 秒执行。`
                : `每小时第 ${minute} 分钟执行。`;
            expressions = [`${minute} * * * *`, `${second} ${minute} * * * *`, `${second} ${minute} * * * ?`, `${second} ${minute} * * * ? *`];
        } else if (type === 'hour-interval') {
            const interval = integer(source.interval, 1, 23, '小时间隔', 2);
            const hasCustomStart = source.hour !== undefined || source.minute !== undefined;
            const standardHourField = hour === 0 ? `*/${interval}` : `${hour}/${interval}`;
            const quartzHourField = `${hour}/${interval}`;
            description = hasCustomStart
                ? `每天从 ${formatTime(hour, minute, second)} 开始，每隔 ${interval} 小时执行一次。`
                : second
                    ? `每隔 ${interval} 小时，在整点后第 ${second} 秒执行一次。`
                    : `每隔 ${interval} 小时整点执行一次。`;
            expressions = [
                `${minute} ${standardHourField} * * *`,
                `${second} ${minute} ${standardHourField} * * *`,
                `${second} ${minute} ${quartzHourField} * * ?`,
                `${second} ${minute} ${quartzHourField} * * ? *`
            ];
        } else if (type === 'daily') {
            description = `每天 ${formatTime(hour, minute, second)} 执行。`;
            expressions = [`${minute} ${hour} * * *`, `${second} ${minute} ${hour} * * *`, `${second} ${minute} ${hour} * * ?`, `${second} ${minute} ${hour} * * ? *`];
        } else if (type === 'weekly') {
            const weekdays = [...new Set(source.weekdays || [])].filter(day => WEEKDAYS[day]);
            if (!weekdays.length) throw new Error('请至少选择一个星期');
            weekdays.sort((a, b) => WEEKDAYS[a].linux - WEEKDAYS[b].linux || (a === 'SUN' ? 1 : 0));
            const names = weekdays.join(',');
            const linuxDays = weekdays.map(day => WEEKDAYS[day].linux).join(',');
            description = `每${weekdays.map(day => WEEKDAYS[day].label).join('、')} ${formatTime(hour, minute, second)} 执行。`;
            expressions = [`${minute} ${hour} * * ${linuxDays}`, `${second} ${minute} ${hour} * * ${names}`, `${second} ${minute} ${hour} ? * ${names}`, `${second} ${minute} ${hour} ? * ${names} *`];
        } else if (type === 'monthly') {
            const day = integer(source.day, 1, 31, '日期', 1);
            description = `每月 ${day} 日 ${formatTime(hour, minute, second)} 执行。`;
            expressions = [`${minute} ${hour} ${day} * *`, `${second} ${minute} ${hour} ${day} * *`, `${second} ${minute} ${hour} ${day} * ?`, `${second} ${minute} ${hour} ${day} * ? *`];
        } else if (type === 'yearly') {
            const month = integer(source.month, 1, 12, '月份', 1);
            const day = integer(source.day, 1, 31, '日期', 1);
            validateCalendarDate(month, day);
            description = `每年 ${month} 月 ${day} 日 ${formatTime(hour, minute, second)} 执行。`;
            expressions = [`${minute} ${hour} ${day} ${month} *`, `${second} ${minute} ${hour} ${day} ${month} *`, `${second} ${minute} ${hour} ${day} ${month} ?`, `${second} ${minute} ${hour} ${day} ${month} ? *`];
        } else {
            throw new Error('不支持的执行周期');
        }

        return {
            description,
            formats: FORMAT_DEFINITIONS.map((format, index) => {
                if (format.id === 'linux' && second !== 0) {
                    return { ...format, expression: null, supported: false, reason: 'Linux 5 段 Cron 不支持秒级精度' };
                }
                return { ...format, expression: expressions[index], supported: true, reason: '' };
            })
        };
    }

    return { generateCron };
});
