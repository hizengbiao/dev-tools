(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    if (root) root.SqlVisualizer = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';

    const RESERVED = new Set([
        'select', 'from', 'where', 'join', 'left', 'right', 'inner', 'outer', 'full', 'cross', 'on',
        'and', 'or', 'not', 'as', 'group', 'by', 'having', 'order', 'asc', 'desc', 'limit', 'offset',
        'union', 'all', 'distinct', 'case', 'when', 'then', 'else', 'end', 'in', 'is', 'null', 'like',
        'between', 'exists', 'with', 'recursive', 'true', 'false', 'count', 'sum', 'avg', 'min', 'max'
    ]);

    class SqlVisualizationError extends Error {
        constructor(message, position = 0, suggestion = '') {
            super(message);
            this.name = 'SqlVisualizationError';
            this.position = Math.max(0, position);
            this.suggestion = suggestion;
        }
    }

    function maskSql(source) {
        const sql = String(source || '');
        let result = '';
        let quote = '';
        let lineComment = false;
        let blockComment = false;
        for (let index = 0; index < sql.length; index += 1) {
            const char = sql[index];
            const next = sql[index + 1];
            if (lineComment) {
                if (char === '\n') {
                    lineComment = false;
                    result += '\n';
                } else result += ' ';
                continue;
            }
            if (blockComment) {
                if (char === '*' && next === '/') {
                    result += '  ';
                    index += 1;
                    blockComment = false;
                } else result += char === '\n' ? '\n' : ' ';
                continue;
            }
            if (quote) {
                if (char === quote) {
                    if (sql[index + 1] === quote && quote !== '`') {
                        result += '  ';
                        index += 1;
                        continue;
                    }
                    quote = '';
                }
                result += char === '\n' ? '\n' : ' ';
                continue;
            }
            if (char === '-' && next === '-') {
                result += '  ';
                index += 1;
                lineComment = true;
            } else if (char === '/' && next === '*') {
                result += '  ';
                index += 1;
                blockComment = true;
            } else if (char === '\'' || char === '"' || char === '`') {
                quote = char;
                result += ' ';
            } else {
                result += char;
            }
        }
        if (quote) throw new SqlVisualizationError('字符串或标识符引号没有闭合。', Math.max(0, sql.length - 1), '请补充缺失的引号。');
        if (blockComment) throw new SqlVisualizationError('块注释没有闭合。', Math.max(0, sql.lastIndexOf('/*')), '请补充 */。');
        return result;
    }

    function depthMap(masked) {
        const depths = new Array(masked.length).fill(0);
        let depth = 0;
        for (let index = 0; index < masked.length; index += 1) {
            if (masked[index] === ')') depth -= 1;
            if (depth < 0) throw new SqlVisualizationError('存在多余的右括号。', index, '请检查括号是否成对。');
            depths[index] = depth;
            if (masked[index] === '(') depth += 1;
        }
        if (depth !== 0) {
            throw new SqlVisualizationError('括号没有闭合。', Math.max(0, masked.lastIndexOf('(')), '请补充缺失的右括号。');
        }
        return depths;
    }

    function lineAt(source, position) {
        return String(source || '').slice(0, Math.max(0, position)).split('\n').length;
    }

    function trimRange(source, start, end) {
        while (start < end && /\s/.test(source[start])) start += 1;
        while (end > start && /\s/.test(source[end - 1])) end -= 1;
        return { start, end, text: source.slice(start, end) };
    }

    function findMatchingParen(masked, openIndex) {
        let depth = 0;
        for (let index = openIndex; index < masked.length; index += 1) {
            if (masked[index] === '(') depth += 1;
            if (masked[index] === ')') {
                depth -= 1;
                if (depth === 0) return index;
            }
        }
        return -1;
    }

    function topLevelMatches(source, expression) {
        const masked = maskSql(source);
        const depths = depthMap(masked);
        const regex = new RegExp(expression.source, expression.flags.includes('g') ? expression.flags : `${expression.flags}g`);
        const matches = [];
        let match;
        while ((match = regex.exec(masked))) {
            if (depths[match.index] === 0) matches.push({ index: match.index, end: regex.lastIndex, text: match[0] });
            if (match[0].length === 0) regex.lastIndex += 1;
        }
        return matches;
    }

    function splitTopLevelComma(source, absoluteStart = 0) {
        const masked = maskSql(source);
        const depths = depthMap(masked);
        const parts = [];
        let start = 0;
        for (let index = 0; index <= source.length; index += 1) {
            if (index === source.length || (source[index] === ',' && depths[index] === 0)) {
                const range = trimRange(source, start, index);
                if (range.text) parts.push({ ...range, start: absoluteStart + range.start, end: absoluteStart + range.end });
                start = index + 1;
            }
        }
        return parts;
    }

    function splitConditions(source, absoluteStart = 0) {
        const matches = topLevelMatches(source, /\b(?:AND|OR)\b/gi);
        const parts = [];
        let start = 0;
        matches.forEach((match) => {
            const range = trimRange(source, start, match.index);
            if (range.text) parts.push({ ...range, start: absoluteStart + range.start, end: absoluteStart + range.end });
            start = match.end;
        });
        const range = trimRange(source, start, source.length);
        if (range.text) parts.push({ ...range, start: absoluteStart + range.start, end: absoluteStart + range.end });
        return parts;
    }

    function cleanIdentifier(value) {
        return String(value || '')
            .trim()
            .replace(/[`"\[\]]/g, '')
            .replace(/\s*\.\s*/g, '.');
    }

    function parseField(item) {
        const text = item.text.trim();
        const aliasMatch = text.match(/\s+AS\s+([`"\[]?[\w$-]+[`"\]]?)\s*$/i)
            || text.match(/\s+([`"\[]?[A-Za-z_][\w$-]*[`"\]]?)\s*$/);
        let expression = text;
        let alias = '';
        if (aliasMatch && !/[).]$/.test(aliasMatch[1]) && !RESERVED.has(cleanIdentifier(aliasMatch[1]).toLowerCase())) {
            const possibleExpression = text.slice(0, aliasMatch.index).trim();
            if (possibleExpression && possibleExpression !== text) {
                expression = possibleExpression;
                alias = cleanIdentifier(aliasMatch[1]);
            }
        }
        return { expression, alias, start: item.start, end: item.end };
    }

    function clauseMap(source) {
        const patterns = [
            ['select', /\bSELECT\b/gi], ['from', /\bFROM\b/gi], ['where', /\bWHERE\b/gi],
            ['groupBy', /\bGROUP\s+BY\b/gi], ['having', /\bHAVING\b/gi],
            ['orderBy', /\bORDER\s+BY\b/gi], ['limit', /\bLIMIT\b/gi]
        ];
        const found = [];
        patterns.forEach(([name, regex]) => {
            const match = topLevelMatches(source, regex)[0];
            if (match) found.push({ name, ...match });
        });
        found.sort((a, b) => a.index - b.index);
        const result = {};
        found.forEach((clause, index) => {
            result[clause.name] = { ...clause, contentStart: clause.end, contentEnd: found[index + 1] ? found[index + 1].index : source.length };
        });
        return result;
    }

    function readSource(sourceText, absoluteStart) {
        const range = trimRange(sourceText, 0, sourceText.length);
        const text = range.text;
        const start = absoluteStart + range.start;
        if (!text) return null;
        if (text[0] === '(') {
            const masked = maskSql(text);
            const closing = findMatchingParen(masked, 0);
            if (closing < 0) throw new SqlVisualizationError('数据源子查询括号没有闭合。', start);
            const inner = text.slice(1, closing).trim();
            const suffix = text.slice(closing + 1).trim().replace(/^AS\s+/i, '');
            const alias = cleanIdentifier((suffix.match(/^[`"\[]?[\w$-]+[`"\]]?/) || ['子查询'])[0]);
            return {
                name: alias || '子查询', alias: alias || 'subquery', kind: 'subquery', start, end: start + text.length,
                subquerySql: inner
            };
        }
        const match = text.match(/^((?:[`"\[]?[A-Za-z_$][\w$-]*[`"\]]?)(?:\s*\.\s*(?:[`"\[]?[A-Za-z_$][\w$-]*[`"\]]?))*)(?:\s+(?:AS\s+)?([`"\[]?[\w$-]+[`"\]]?))?/i);
        if (!match) throw new SqlVisualizationError(`无法识别数据源：${text}`, start, '请检查 FROM 或 JOIN 后的表名和别名。');
        const name = cleanIdentifier(match[1]);
        const aliasCandidate = cleanIdentifier(match[2] || '');
        const alias = aliasCandidate && !RESERVED.has(aliasCandidate.toLowerCase()) ? aliasCandidate : name.split('.').pop();
        return { name, alias, kind: 'table', start, end: start + match[0].length };
    }

    function parseFromSection(source, absoluteStart) {
        const joins = topLevelMatches(source, /\b(?:(?:LEFT|RIGHT|FULL)(?:\s+OUTER)?|INNER|CROSS)?\s*JOIN\b/gi);
        const baseEnd = joins[0] ? joins[0].index : source.length;
        const tables = [];
        const relations = [];
        const base = readSource(source.slice(0, baseEnd), absoluteStart);
        if (base) tables.push(base);
        joins.forEach((joinMatch, index) => {
            const segmentEnd = joins[index + 1] ? joins[index + 1].index : source.length;
            const segmentStart = joinMatch.end;
            const segment = source.slice(segmentStart, segmentEnd);
            const onMatch = topLevelMatches(segment, /\bON\b/gi)[0];
            const sourcePart = segment.slice(0, onMatch ? onMatch.index : segment.length);
            const table = readSource(sourcePart, absoluteStart + segmentStart);
            if (!table) return;
            tables.push(table);
            const conditionRange = onMatch
                ? trimRange(segment, onMatch.end, segment.length)
                : { text: '', start: segment.length, end: segment.length };
            const joinTypeText = joinMatch.text.trim().replace(/\s+/g, ' ').toUpperCase();
            relations.push({
                type: joinTypeText === 'JOIN' ? 'INNER JOIN' : joinTypeText,
                condition: conditionRange.text,
                leftAlias: tables[tables.length - 2] ? tables[tables.length - 2].alias : '',
                rightAlias: table.alias,
                start: absoluteStart + joinMatch.index,
                end: absoluteStart + segmentEnd
            });
        });
        return { tables, joins: relations };
    }

    function collectFields(block, source, absoluteStart) {
        const aliases = new Map(block.tables.map((table) => [table.alias.toLowerCase(), table]));
        const fieldMaps = new Map(block.tables.map((table) => [table.alias.toLowerCase(), new Map()]));
        function add(alias, name, role) {
            const key = alias.toLowerCase();
            if (!fieldMaps.has(key) || !name || name === '*') return;
            const fields = fieldMaps.get(key);
            const normalizedName = cleanIdentifier(name);
            if (!fields.has(normalizedName)) fields.set(normalizedName, { name: normalizedName, roles: [] });
            const field = fields.get(normalizedName);
            if (!field.roles.includes(role)) field.roles.push(role);
        }
        const roleSegments = [
            ['SELECT', block.selectRange], ['WHERE', block.whereRange], ['GROUP BY', block.groupRange],
            ['HAVING', block.havingRange], ['ORDER BY', block.orderRange]
        ];
        block.joins.forEach((join) => roleSegments.push(['JOIN', { start: join.start, end: join.end }]));
        roleSegments.forEach(([role, range]) => {
            if (!range) return;
            const text = source.slice(range.start - absoluteStart, range.end - absoluteStart);
            const regex = /\b([A-Za-z_][\w$]*)\.([A-Za-z_*][\w$]*)\b/g;
            let match;
            while ((match = regex.exec(text))) add(match[1], match[2], role);
        });
        if (block.tables.length === 1) {
            const table = block.tables[0];
            block.fields.forEach((field) => {
                const plain = field.expression.match(/^(?:[`"\[]?)([A-Za-z_][\w$]*)(?:[`"\]]?)$/);
                if (plain && !RESERVED.has(plain[1].toLowerCase())) add(table.alias, plain[1], 'SELECT');
            });
        }
        block.tables.forEach((table) => {
            table.fields = [...(fieldMaps.get(table.alias.toLowerCase()) || new Map()).values()];
            table.isCte = Boolean(aliases.get(table.alias.toLowerCase()) && table.kind === 'cte');
        });
    }

    function parseSubqueries(fragment, absoluteStart) {
        const masked = maskSql(fragment);
        const result = [];
        for (let index = 0; index < masked.length; index += 1) {
            if (masked[index] !== '(') continue;
            const closing = findMatchingParen(masked, index);
            if (closing < 0) break;
            const inner = fragment.slice(index + 1, closing);
            if (/^\s*(?:SELECT|WITH)\b/i.test(inner)) {
                result.push({
                    start: absoluteStart + index,
                    end: absoluteStart + closing + 1,
                    sql: inner.trim(),
                    model: parseSql(inner.trim(), { nested: true })
                });
            }
            index = closing;
        }
        return result;
    }

    function parseSelectBlock(source, absoluteStart = 0, id = 'query-1') {
        const clauses = clauseMap(source);
        if (!clauses.select) throw new SqlVisualizationError('查询中缺少 SELECT。', absoluteStart, '请确认输入的是 SELECT 查询。');
        if (clauses.from && clauses.from.index < clauses.select.index) {
            throw new SqlVisualizationError('FROM 出现在 SELECT 之前。', absoluteStart + clauses.from.index, '请检查 SELECT 与 FROM 的顺序。');
        }
        const selectText = source.slice(clauses.select.contentStart, clauses.select.contentEnd);
        const distinct = /^\s*DISTINCT\b/i.test(selectText);
        const selectOffset = clauses.select.contentStart + (distinct ? (selectText.match(/^\s*DISTINCT\s*/i) || [''])[0].length : 0);
        const fields = splitTopLevelComma(source.slice(selectOffset, clauses.select.contentEnd), absoluteStart + selectOffset).map(parseField);
        if (!fields.length) throw new SqlVisualizationError('SELECT 后没有可识别的查询字段。', absoluteStart + clauses.select.end);

        const from = clauses.from
            ? parseFromSection(source.slice(clauses.from.contentStart, clauses.from.contentEnd), absoluteStart + clauses.from.contentStart)
            : { tables: [], joins: [] };
        const clauseItems = (clause, splitter) => clause
            ? splitter(source.slice(clause.contentStart, clause.contentEnd), absoluteStart + clause.contentStart)
            : [];
        const block = {
            id, type: 'select', start: absoluteStart, end: absoluteStart + source.length, distinct,
            fields, tables: from.tables, joins: from.joins,
            where: clauseItems(clauses.where, splitConditions),
            groupBy: clauseItems(clauses.groupBy, splitTopLevelComma),
            having: clauseItems(clauses.having, splitConditions),
            orderBy: clauseItems(clauses.orderBy, splitTopLevelComma),
            limit: clauses.limit ? trimRange(source, clauses.limit.contentStart, clauses.limit.contentEnd).text : '',
            selectRange: { start: absoluteStart + clauses.select.index, end: absoluteStart + clauses.select.contentEnd },
            whereRange: clauses.where ? { start: absoluteStart + clauses.where.index, end: absoluteStart + clauses.where.contentEnd } : null,
            groupRange: clauses.groupBy ? { start: absoluteStart + clauses.groupBy.index, end: absoluteStart + clauses.groupBy.contentEnd } : null,
            havingRange: clauses.having ? { start: absoluteStart + clauses.having.index, end: absoluteStart + clauses.having.contentEnd } : null,
            orderRange: clauses.orderBy ? { start: absoluteStart + clauses.orderBy.index, end: absoluteStart + clauses.orderBy.contentEnd } : null,
            limitRange: clauses.limit ? { start: absoluteStart + clauses.limit.index, end: absoluteStart + clauses.limit.contentEnd } : null,
            subqueries: []
        };
        const nestedRanges = [block.selectRange, block.whereRange, block.havingRange].filter(Boolean);
        block.joins.forEach((join) => nestedRanges.push({ start: join.start, end: join.end }));
        nestedRanges.forEach((range) => {
            block.subqueries.push(...parseSubqueries(source.slice(range.start - absoluteStart, range.end - absoluteStart), range.start));
        });
        block.tables.filter((table) => table.kind === 'subquery' && table.subquerySql).forEach((table) => {
            block.subqueries.push({
                start: table.start,
                end: table.end,
                sql: table.subquerySql,
                model: parseSql(table.subquerySql, { nested: true })
            });
        });
        block.subqueries = block.subqueries.filter((subquery, index, items) =>
            items.findIndex(item => item.start === subquery.start && item.end === subquery.end) === index
        );
        collectFields(block, source, absoluteStart);
        return block;
    }

    function parseCtes(source) {
        const masked = maskSql(source);
        if (!/^\s*WITH\b/i.test(masked)) return { ctes: [], mainStart: 0 };
        let cursor = (masked.match(/^\s*WITH\s+(?:RECURSIVE\s+)?/i) || [''])[0].length;
        const ctes = [];
        while (cursor < source.length) {
            const nameMatch = masked.slice(cursor).match(/^\s*([`"\[]?[A-Za-z_][\w$-]*[`"\]]?)\s+AS\s*\(/i);
            if (!nameMatch) throw new SqlVisualizationError('CTE 定义格式无法识别。', cursor, '请使用 WITH name AS (SELECT ...) 格式。');
            const name = cleanIdentifier(nameMatch[1]);
            const open = cursor + nameMatch[0].lastIndexOf('(');
            const close = findMatchingParen(masked, open);
            if (close < 0) throw new SqlVisualizationError(`CTE ${name} 的括号没有闭合。`, open);
            const innerRange = trimRange(source, open + 1, close);
            ctes.push({ name, start: cursor, end: close + 1, query: parseSql(innerRange.text, { nested: true }) });
            cursor = close + 1;
            while (/\s/.test(masked[cursor] || '')) cursor += 1;
            if (masked[cursor] === ',') {
                cursor += 1;
                continue;
            }
            break;
        }
        return { ctes, mainStart: cursor };
    }

    function parseSql(input, options = {}) {
        const source = String(input || '').trim();
        if (!source) throw new SqlVisualizationError('请输入需要可视化的 SQL。', 0);
        if (/<(?:mapper|select|insert|update|delete|if|foreach)\b/i.test(source)) {
            throw new SqlVisualizationError('SQL 可视化暂不支持 MyBatis XML 标签。', 0, '请提取其中一条完整 SELECT SQL 后再生成。');
        }
        const typo = maskSql(source).match(/\b(?:(?:LEFT|RIGHT|INNER|CROSS|FULL)\s+)?JION\b/i);
        if (typo) throw new SqlVisualizationError(`存在 JOIN 拼写错误：${typo[0]}`, typo.index, typo[0].replace(/JION/i, 'JOIN'));
        depthMap(maskSql(source));
        if (!/^\s*(?:WITH|SELECT)\b/i.test(source)) {
            throw new SqlVisualizationError('当前可视化仅支持 SELECT / WITH 查询。', 0, 'INSERT、UPDATE、DELETE、DDL 和存储过程暂不生成关系图。');
        }
        const { ctes, mainStart } = parseCtes(source);
        const mainSql = source.slice(mainStart).trim().replace(/;\s*$/, '');
        const leadingWhitespace = source.slice(mainStart).search(/\S|$/);
        const mainOffset = mainStart + leadingWhitespace;
        const unions = topLevelMatches(mainSql, /\bUNION(?:\s+ALL)?\b/gi);
        const branches = [];
        const unionTypes = [];
        let start = 0;
        unions.forEach((union, index) => {
            const range = trimRange(mainSql, start, union.index);
            branches.push(parseSelectBlock(range.text, mainOffset + range.start, `query-${index + 1}`));
            unionTypes.push(union.text.trim().replace(/\s+/g, ' ').toUpperCase());
            start = union.end;
        });
        const last = trimRange(mainSql, start, mainSql.length);
        branches.push(parseSelectBlock(last.text, mainOffset + last.start, `query-${branches.length + 1}`));
        const cteNames = new Set(ctes.map((cte) => cte.name.toLowerCase()));
        branches.forEach((branch) => branch.tables.forEach((table) => {
            if (cteNames.has(table.name.toLowerCase())) table.kind = 'cte';
        }));
        return { type: 'sql-visualization', sql: source, ctes, branches, unions: unionTypes, nested: Boolean(options.nested) };
    }

    function nodeItems(items, limit = 8) {
        const values = items.filter(Boolean).map((item) => typeof item === 'string' ? item : item.text || item.expression || item.name);
        return values.length > limit ? [...values.slice(0, limit), `… 另有 ${values.length - limit} 项`] : values;
    }

    function buildGraph(model) {
        const nodes = [];
        const edges = [];
        let sequence = 0;
        const addNode = (node) => {
            const normalized = { width: 230, height: 132, items: [], ...node, id: node.id || `node-${++sequence}` };
            nodes.push(normalized);
            return normalized;
        };
        const addEdge = (from, to, label = '') => edges.push({ id: `edge-${edges.length + 1}`, from, to, label });

        let cteX = 40;
        model.ctes.forEach((cte) => {
            const sourceTables = cte.query.branches.flatMap((branch) => branch.tables.map((table) => table.name));
            const stages = cte.query.branches.flatMap((branch) => [
                branch.where.length ? 'WHERE' : '', branch.groupBy.length ? 'GROUP BY' : '',
                branch.having.length ? 'HAVING' : '', 'SELECT', branch.orderBy.length ? 'ORDER BY' : ''
            ]).filter(Boolean);
            const node = addNode({
                type: 'cte', title: `CTE · ${cte.name}`, x: cteX, y: 30,
                items: nodeItems([
                    `来源：${sourceTables.join(', ') || '子查询'}`,
                    `流程：${[...sourceTables, ...stages, cte.name].join(' → ')}`,
                    '临时结果集'
                ]),
                detail: {
                    '临时表名': cte.name,
                    '来源表': sourceTables.join(', ') || '无',
                    '生成流程': [...sourceTables, ...stages, cte.name].join(' → ')
                }, range: { start: cte.start, end: cte.end }
            });
            cte.graphNodeId = node.id;
            cteX += 270;
        });

        const branchResults = [];
        let graphBottom = model.ctes.length ? 220 : 20;
        model.branches.forEach((branch, branchIndex) => {
            const branchX = 40 + branchIndex * 620;
            const tableY = graphBottom;
            const tableNodes = [];
            branch.tables.forEach((table, tableIndex) => {
                const markers = { JOIN: '🔗', WHERE: '⚲', SELECT: '●', 'GROUP BY': 'Σ', HAVING: 'Σ', 'ORDER BY': '↕' };
                const items = table.fields.length
                    ? table.fields.map((field) => `${field.roles.map((role) => markers[role] || '•').join('')} ${field.name}`)
                    : ['未识别到限定字段'];
                const node = addNode({
                    type: table.kind === 'cte' ? 'cte-source' : table.kind === 'subquery' ? 'subquery' : 'table',
                    title: table.alias && table.alias !== table.name ? `${table.name}  ·  ${table.alias}` : table.name,
                    x: branchX + tableIndex * 270, y: tableY, items: nodeItems(items),
                    detail: {
                        '表名': table.name, '别名': table.alias || '无',
                        '涉及字段': table.fields.map((field) => field.name).join(', ') || '未识别',
                        '参与环节': [...new Set(table.fields.flatMap((field) => field.roles))].join(', ') || 'FROM'
                    },
                    range: { start: table.start, end: table.end }
                });
                table.graphNodeId = node.id;
                tableNodes.push(node);
                if (table.kind === 'cte') {
                    const cte = model.ctes.find((item) => item.name.toLowerCase() === table.name.toLowerCase());
                    if (cte && cte.graphNodeId) addEdge(cte.graphNodeId, node.id, 'CTE 结果');
                }
            });
            branch.joins.forEach((join, index) => {
                if (tableNodes[index] && tableNodes[index + 1]) addEdge(tableNodes[index].id, tableNodes[index + 1].id, `${join.type}\n${join.condition || '无 ON 条件'}`);
            });

            const centerX = branchX + Math.max(0, (tableNodes.length - 1) * 135);
            let y = tableY + 205;
            const pipeline = [];
            const flowSpecs = [
                ['where', 'WHERE', branch.where, branch.whereRange],
                ['group', 'GROUP BY', branch.groupBy, branch.groupRange],
                ['having', 'HAVING', branch.having, branch.havingRange],
                ['select', branch.distinct ? 'SELECT DISTINCT' : 'SELECT', branch.fields, branch.selectRange],
                ['order', 'ORDER BY', branch.orderBy, branch.orderRange],
                ['limit', 'LIMIT', branch.limit ? [branch.limit] : [], branch.limitRange]
            ];
            flowSpecs.forEach(([type, title, values, range]) => {
                if (!values || !values.length) return;
                const node = addNode({
                    type, title, x: centerX, y, width: 280, items: nodeItems(values), range,
                    detail: { '处理阶段': title, '内容': nodeItems(values, 30).join('\n') }
                });
                pipeline.push(node);
                y += 172;
            });
            branch.subqueries.forEach((subquery, index) => {
                const tables = subquery.model.branches.flatMap((item) => item.tables.map((table) => table.name));
                const node = addNode({
                    type: 'subquery', title: `子查询 ${index + 1}`, x: centerX + 330, y: tableY + 205 + index * 165,
                    items: nodeItems([`来源：${tables.join(', ') || '无表查询'}`, `层级：${branchIndex + 2}`]),
                    detail: { '子查询来源': tables.join(', ') || '无', 'SQL': subquery.sql },
                    range: { start: subquery.start, end: subquery.end }, group: `subquery-${branchIndex}-${index}`
                });
                if (pipeline[0]) addEdge(node.id, pipeline[0].id, '子查询结果');
            });
            const result = addNode({
                type: model.branches.length > 1 ? 'branch-result' : 'result',
                title: model.branches.length > 1 ? `分支 ${branchIndex + 1} 结果` : 'RESULT',
                x: centerX, y, items: [`输出 ${branch.fields.length} 个字段`],
                detail: { '结果字段': branch.fields.map((field) => field.alias || field.expression).join(', ') },
                range: { start: branch.start, end: branch.end }
            });
            const firstFlow = pipeline[0] || result;
            tableNodes.forEach((tableNode) => addEdge(tableNode.id, firstFlow.id, '数据源'));
            for (let index = 0; index < pipeline.length - 1; index += 1) addEdge(pipeline[index].id, pipeline[index + 1].id, '');
            if (pipeline.length) addEdge(pipeline[pipeline.length - 1].id, result.id, '');
            branchResults.push(result);
            graphBottom = Math.max(graphBottom, y + 180);
        });

        if (model.unions.length) {
            const union = addNode({
                type: 'union', title: model.unions.join(' → '), x: 40 + (model.branches.length - 1) * 310,
                y: graphBottom, width: 280, items: ['合并各查询分支'], detail: { '合并方式': model.unions.join(', ') }
            });
            branchResults.forEach((result, index) => addEdge(result.id, union.id, model.unions[index] || model.unions[index - 1] || 'UNION'));
            const finalResult = addNode({
                type: 'result', title: 'RESULT', x: union.x, y: graphBottom + 180, width: 280,
                items: ['UNION 最终结果'], detail: { '查询分支': String(model.branches.length) }
            });
            addEdge(union.id, finalResult.id, '');
        }
        const width = Math.max(900, ...nodes.map((node) => node.x + node.width + 60));
        const height = Math.max(620, ...nodes.map((node) => node.y + node.height + 80));
        return { nodes, edges, width, height };
    }

    function formatError(error, sql) {
        const position = Number.isFinite(error.position) ? error.position : 0;
        return {
            message: error.message || 'SQL 解析失败。',
            line: lineAt(sql, position),
            position,
            suggestion: error.suggestion || ''
        };
    }

    return { SqlVisualizationError, parseSql, buildGraph, formatError, splitTopLevelComma, splitConditions };
});
