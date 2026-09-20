(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.SqlFlowDemo = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';
    const sampleSql = "SELECT city, SUM(amount) AS total\nFROM demo_sales\nWHERE status = 'paid'\nGROUP BY city\nHAVING SUM(amount) >= 300\nORDER BY total DESC\nLIMIT 2;";
    const sampleData = { demo_sales: [
        { id: 1, city: '杭州', amount: 120, status: 'paid' },
        { id: 2, city: '杭州', amount: 240, status: 'paid' },
        { id: 3, city: '上海', amount: 180, status: 'paid' },
        { id: 4, city: '上海', amount: 500, status: 'cancelled' },
        { id: 5, city: '北京', amount: 450, status: 'paid' },
        { id: 6, city: '深圳', amount: 320, status: 'paid' }
    ] };
    function fail(message) { throw new Error(message); }
    function truth(value) {
        if (value === null || typeof value === 'boolean') return value;
        if (typeof value === 'number') return value !== 0;
        fail('条件演示暂不支持字符串到布尔值的隐式转换');
    }
    // Deliberately small SQL expression interpreter: no eval, no database connection.
    function compile(text, allowAggregate = false) {
        const tokens = [];
        const re = /\s+|'(?:''|[^'])*'|`[^`]+`|\d+(?:\.\d+)?|>=|<=|<>|!=|[=><(),.*-]|[A-Za-z_][\w$]*/gy;
        let pos = 0;
        while (pos < text.length) {
            re.lastIndex = pos;
            const match = re.exec(text);
            if (!match) fail(`暂不演算表达式：${text}`);
            pos = re.lastIndex;
            if (!/^\s+$/.test(match[0])) tokens.push(match[0]);
        }
        let i = 0;
        const peek = () => (tokens[i] || '').toUpperCase();
        const take = value => { if (peek() === value) { i++; return true; } return false; };
        function atom() {
            if (take('(')) { const value = or(); if (!take(')')) fail('括号不完整'); return value; }
            const token = tokens[i++];
            if (!token) fail('表达式缺少值');
            if (token[0] === "'") return () => token.slice(1, -1).replace(/''/g, "'");
            if (/^\d/.test(token)) return () => Number(token);
            if (token === '-') { const next = atom(); return context => { const value = next(context); if (value === null) return null; if (typeof value !== 'number') fail('负号仅支持数值'); return -value; }; }
            if (/^NULL$/i.test(token)) return () => null;
            if (/^(TRUE|FALSE)$/i.test(token)) return () => /^TRUE$/i.test(token);
            if (!/^(?:[A-Za-z_][\w$]*|`[^`]+`)$/.test(token)) fail(`不支持的表达式：${text}`);
            if (take('(')) {
                const name = token.toUpperCase();
                if (!allowAggregate || !['SUM', 'COUNT', 'AVG', 'MIN', 'MAX'].includes(name)) fail(`暂不演算函数 ${name}`);
                const star = take('*');
                if (star && name !== 'COUNT') fail('仅 COUNT 支持 *');
                const value = star ? () => 1 : atom();
                if (!take(')')) fail('聚合函数仅支持单字段参数');
                return context => {
                    if (!context.group) fail('此处没有可聚合的分组');
                    const values = context.group.map(row => value({ row })).filter(v => v !== null);
                    if (name === 'COUNT') return values.length;
                    if (!values.length) return null;
                    if (name === 'MIN') return values.reduce((a, b) => a < b ? a : b);
                    if (name === 'MAX') return values.reduce((a, b) => a > b ? a : b);
                    if (values.some(v => typeof v !== 'number')) fail('SUM / AVG 演示要求数值字段');
                    const sum = values.reduce((a, b) => a + b, 0);
                    return name === 'AVG' ? sum / values.length : sum;
                };
            }
            let name = token.replace(/`/g, '');
            if (take('.')) name += '.' + (tokens[i++] || '').replace(/`/g, '');
            return context => {
                if (context.values && Object.hasOwn(context.values, name)) return context.values[name];
                if (!Object.hasOwn(context.row, name)) fail(`示例数据缺少字段：${name}`);
                return context.row[name];
            };
        }
        function compare() {
            const left = atom();
            if (take('IS')) { const not = take('NOT'); if (!take('NULL')) fail('IS 仅支持 NULL'); return c => not ? left(c) !== null : left(c) === null; }
            const op = peek();
            if (!['=', '!=', '<>', '>', '<', '>=', '<='].includes(op)) return left;
            i++;
            const right = atom();
            return c => {
                const a = left(c), b = right(c);
                if (a === null || b === null) return null;
                if (typeof a !== typeof b) fail('演示暂不支持不同类型之间的隐式转换');
                if (op === '=') return a === b;
                if (op === '!=' || op === '<>') return a !== b;
                return op === '>' ? a > b : op === '<' ? a < b : op === '>=' ? a >= b : a <= b;
            };
        }
        function and() {
            let result = compare();
            while (take('AND')) { const a = result, b = compare(); result = c => { const x = truth(a(c)), y = truth(b(c)); return x === false || y === false ? false : x === null || y === null ? null : Boolean(x && y); }; }
            return result;
        }
        function or() {
            let result = and();
            while (take('OR')) { const a = result, b = and(); result = c => { const x = truth(a(c)), y = truth(b(c)); return x === true || y === true ? true : x === null || y === null ? null : Boolean(x || y); }; }
            return result;
        }
        const evaluate = or();
        if (i !== tokens.length) fail(`暂不演算表达式：${text}`);
        return evaluate;
    }

    function run(model, data) {
        if (model.ctes.length || model.branches.length !== 1) fail('CTE / UNION 请查看结构图；数据演示当前支持单表 SELECT。');
        const b = model.branches[0];
        if (b.tables.length !== 1 || b.joins.length || b.subqueries.length || b.tables[0].kind !== 'table') fail('JOIN / 子查询请查看结构图；可加载销售示例体验完整数据流。');
        const table = b.tables[0];
        if (!data || !Object.hasOwn(data, table.name) || !Array.isArray(data[table.name])) fail(`请在示例数据 JSON 中提供表 ${table.name} 的数组。`);
        const source = data[table.name];
        if (source.length > 200) fail('每张演示表最多 200 行，请缩小示例数据。');
        const keys = Object.keys(source[0] || {});
        if (keys.length > 30) fail('演示数据最多 30 列。');
        for (const row of source) {
            if (!row || Array.isArray(row) || typeof row !== 'object' || Object.keys(row).length !== keys.length || keys.some(k => !Object.hasOwn(row, k))) fail('各行需为字段一致的 JSON 对象。');
            if (Object.values(row).some(v => v !== null && !['string', 'number', 'boolean'].includes(typeof v))) fail('字段仅支持字符串、数字、布尔值和 null。');
        }
        let contexts = source.map((row, index) => {
            const qualified = Object.assign(Object.create(null), row);
            for (const key of keys) qualified[`${table.alias || table.name}.${key}`] = row[key];
            return { row: qualified, display: row, ids: [index + 1] };
        });
        const stages = [];
        const snapshot = rows => rows.map(c => ({ values: c.display, ids: c.ids }));
        function add(name, clause, explanation, before, after) {
            stages.push({ name, clause, explanation, before: snapshot(before), after: snapshot(after) });
        }
        add('FROM', table.name, `读取 ${source.length} 行示例数据；行号用于追踪来源。`, [], contexts);
        const clause = (range, keyword) => range ? model.sql.slice(range.start, range.end).replace(new RegExp('^' + keyword + '\\s+', 'i'), '').trim() : '';
        if (b.where.length) {
            const text = clause(b.whereRange, 'WHERE'), test = compile(text);
            const next = contexts.filter(c => truth(test(c)) === true);
            add('WHERE', text, `逐行检查条件，保留 ${next.length} 行，过滤 ${contexts.length - next.length} 行。`, contexts, next);
            contexts = next;
        }
        const aggregateText = [...b.fields.map(f => f.expression), ...b.having.map(f => f.text), ...b.orderBy.map(f => f.text)]
            .join(' ').replace(/'(?:''|[^'])*'/g, '');
        const aggregateExpressions = [...new Set((aggregateText.match(/\b(?:SUM|COUNT|AVG|MIN|MAX)\s*\(\s*(?:\*|[\w.`]+)\s*\)/gi) || []))];
        const aggregateFns = aggregateExpressions.map(text => [text, compile(text, true)]);
        if (b.groupBy.length || aggregateFns.length) {
            const groupFns = b.groupBy.map(item => compile(item.text));
            const groups = new Map();
            if (!groupFns.length) groups.set('all', []);
            for (const c of contexts) { const key = JSON.stringify(groupFns.map(fn => fn(c))); if (!groups.has(key)) groups.set(key, []); groups.get(key).push(c); }
            const next = [...groups.values()].map(members => {
                const c = { row: members[0]?.row || {}, group: members.map(m => m.row), ids: members.flatMap(m => m.ids), display: Object.create(null) };
                b.groupBy.forEach((item, index) => c.display[item.text] = groupFns[index](c));
                aggregateFns.forEach(([text, fn]) => c.display[text] = fn(c));
                c.display['分组行数'] = members.length;
                return c;
            });
            add('GROUP BY', b.groupBy.map(i => i.text).join(', ') || '整体聚合', `${contexts.length} 行归为 ${next.length} 组，同一组的来源行号会合并；聚合值由这些行计算。`, contexts, next);
            contexts = next;
        }
        const projections = b.fields.map(f => [f.alias || f.expression, f.expression === '*' ? null : compile(f.expression, true)]);
        if (b.groupBy.length || aggregateFns.length) {
            const groupFields = new Set(b.groupBy.map(f => f.text.toLowerCase()));
            b.fields.forEach(f => { if (!/^(SUM|COUNT|AVG|MIN|MAX)\s*\(/i.test(f.expression) && !groupFields.has(f.expression.toLowerCase())) fail('聚合演示要求非聚合输出字段出现在 GROUP BY 中。'); });
        }
        // MySQL permits SELECT aliases in HAVING; compute them without projecting away source columns.
        contexts.forEach(c => { c.values = Object.create(null); projections.forEach(([name, fn]) => { if (fn) c.values[name] = fn(c); }); });
        if (b.having.length) {
            const text = clause(b.havingRange, 'HAVING'), test = compile(text, true);
            const next = contexts.filter(c => truth(test(c)) === true);
            add('HAVING', text, `检查分组结果，保留 ${next.length} 组，过滤 ${contexts.length - next.length} 组。`, contexts, next);
            contexts = next;
        }
        let next = contexts.map(c => ({ ...c, display: Object.assign(Object.create(null), ...projections.map(([name, fn]) => fn ? { [name]: c.values[name] } : c.display)) }));
        add('SELECT', b.fields.map(f => f.expression + (f.alias ? ' AS ' + f.alias : '')).join(', '), '只输出选定字段，并将聚合列改为指定别名。', contexts, next);
        contexts = next;
        if (b.distinct) {
            const seen = new Set();
            next = contexts.filter(c => { const key = JSON.stringify(c.display); if (seen.has(key)) return false; seen.add(key); return true; });
            add('DISTINCT', 'DISTINCT', `按完整输出行去重，移除 ${contexts.length - next.length} 行。`, contexts, next); contexts = next;
        }
        if (b.orderBy.length) {
            const sorters = b.orderBy.map(item => {
                const match = item.text.match(/^(.*?)(?:\s+(ASC|DESC))?$/i);
                if (/^\d+$/.test(match[1])) fail('演示排序请使用字段名或别名，不使用列序号。');
                return { fn: compile(match[1], true), direction: /^DESC$/i.test(match[2] || '') ? -1 : 1 };
            });
            next = [...contexts].sort((a, b) => {
                for (const s of sorters) { const x = s.fn(a), y = s.fn(b); if (x === y) continue; return (x === null ? -1 : y === null ? 1 : x < y ? -1 : 1) * s.direction; } return 0;
            });
            add('ORDER BY', b.orderBy.map(i => i.text).join(', '), '只改变排列顺序，来源行号不变。字符串按演示器字符顺序比较。', contexts, next); contexts = next;
        }
        if (b.limit) {
            const match = b.limit.match(/^(\d+)(?:\s*,\s*(\d+)|\s+OFFSET\s+(\d+))?$/i);
            if (!match) fail('LIMIT 演示仅支持非负整数字面量。');
            const offset = Number(match[2] ? match[1] : match[3] || 0), count = Number(match[2] || match[1]);
            next = contexts.slice(offset, offset + count);
            add('LIMIT', b.limit, `跳过 ${offset} 行，最多返回 ${count} 行。`, contexts, next); contexts = next;
        }
        add('RESULT', '最终结果', `最终返回 ${contexts.length} 行；此结果仅基于演示数据。`, contexts, contexts);
        return stages;
    }
    return { sampleSql, sampleData, run, compile };
});
