(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }
    root.SqlFormatter = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    const RESERVED_WORDS = new Set([
        'select', 'distinct', 'from', 'where', 'and', 'or', 'group', 'by', 'order', 'having', 'limit', 'offset',
        'insert', 'into', 'values', 'update', 'set', 'delete', 'join', 'inner', 'left', 'right', 'full', 'outer',
        'cross', 'on', 'union', 'all', 'case', 'when', 'then', 'else', 'end', 'as', 'in', 'is', 'not', 'null',
        'like', 'between', 'exists', 'desc', 'asc', 'create', 'table', 'alter', 'drop', 'truncate', 'returning',
    ]);

    const CLAUSES = [
        'SELECT', 'FROM', 'WHERE', 'GROUP BY', 'ORDER BY', 'HAVING', 'LIMIT', 'OFFSET', 'VALUES', 'SET',
        'RETURNING', 'UNION ALL', 'UNION', 'INSERT INTO', 'UPDATE', 'DELETE FROM',
    ];

    function stripSqlComments(sql) {
        return String(sql || '')
            .replace(/\/\*[\s\S]*?\*\//g, ' ')
            .replace(/--[^\r\n]*/g, ' ');
    }

    function normalizeOperators(sql) {
        return sql
            .replace(/\s*([=<>!]=?|<>|!=)\s*/g, ' $1 ')
            .replace(/\s*,\s*/g, ', ')
            .replace(/\(\s+/g, '(')
            .replace(/\s+\)/g, ')');
    }

    function splitLeadingComments(sql) {
        const comments = [];
        let rest = String(sql || '').trim();
        let match;
        while ((match = rest.match(/^(--[^\r\n]*(?:\r?\n|$)|\/\*[\s\S]*?\*\/)\s*/))) {
            comments.push(match[1].trim());
            rest = rest.slice(match[0].length);
        }
        return { comments, sql: rest };
    }

    function transformTopLevelCommas(sql, replacement) {
        let result = '';
        let depth = 0;
        let quote = '';
        for (let index = 0; index < sql.length; index += 1) {
            const char = sql[index];
            const previous = sql[index - 1];
            if (quote) {
                result += char;
                if (char === quote && previous !== '\\') quote = '';
                continue;
            }
            if (char === '\'' || char === '"' || char === '`') {
                quote = char;
                result += char;
                continue;
            }
            if (char === '(') depth += 1;
            if (char === ')') depth = Math.max(0, depth - 1);
            if (char === ',' && depth === 0) {
                result += replacement;
                while (/\s/.test(sql[index + 1] || '')) index += 1;
            } else {
                result += char;
            }
        }
        return result;
    }

    function findClosingParenthesis(sql, openingIndex) {
        let depth = 0;
        let quote = '';
        for (let index = openingIndex; index < sql.length; index += 1) {
            const char = sql[index];
            const previous = sql[index - 1];
            if (quote) {
                if (char === quote && previous !== '\\') quote = '';
                continue;
            }
            if (char === '\'' || char === '"' || char === '`') {
                quote = char;
            } else if (char === '(') {
                depth += 1;
            } else if (char === ')' && --depth === 0) {
                return index;
            }
        }
        return -1;
    }

    function formatCreateTable(sql) {
        const header = sql.match(/^CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+[^\s(]+\s*\(/i);
        if (!header) return null;
        const openingIndex = header[0].lastIndexOf('(');
        const closingIndex = findClosingParenthesis(sql, openingIndex);
        if (closingIndex < 0) return null;

        const heading = sql.slice(0, openingIndex).trim();
        const body = sql.slice(openingIndex + 1, closingIndex).trim();
        const columns = transformTopLevelCommas(body, '\n')
            .split('\n')
            .map((part) => normalizeOperators(part.replace(/\s+/g, ' ').trim()))
            .filter(Boolean);
        const formattedBody = columns.map((part, index) => `  ${part}${index < columns.length - 1 ? ',' : ''}`).join('\n');
        let suffix = normalizeOperators(sql.slice(closingIndex + 1).replace(/\s+/g, ' ').trim());
        suffix = suffix.replace(/\s+(?=(?:AUTO_INCREMENT|DEFAULT\s+CHARSET|COLLATE|ROW_FORMAT|COMMENT)\s*=)/gi, '\n  ');
        return `${heading} (\n${formattedBody}\n)${suffix ? ` ${suffix}` : ''}`;
    }

    function uppercaseKeywords(sql) {
        return sql.replace(/\b[a-z_]+\b/gi, (word) => {
            const lower = word.toLowerCase();
            return RESERVED_WORDS.has(lower) ? word.toUpperCase() : word;
        });
    }

    function protectPhrase(sql, phrase) {
        const token = phrase.replace(/\s+/g, '_');
        return sql.replace(new RegExp(`\\b${phrase.replace(/\s+/g, '\\s+')}\\b`, 'gi'), token);
    }

    function restorePhrase(sql, phrase) {
        const token = phrase.replace(/\s+/g, '_');
        return sql.replace(new RegExp(`\\b${token}\\b`, 'g'), phrase);
    }

    function isMyBatisSql(input) {
        return /<(?:mapper|select|insert|update|delete|sql)\b[^>]*>/i.test(String(input || ''));
    }

    function normalizeXmlTag(tag) {
        let result = '';
        let quote = '';
        let pendingSpace = false;
        for (const char of String(tag || '').trim()) {
            if (quote) {
                result += char;
                if (char === quote) quote = '';
                continue;
            }
            if (char === '\'' || char === '"') {
                if (pendingSpace && result && !result.endsWith('<') && !result.endsWith(' ')) result += ' ';
                pendingSpace = false;
                quote = char;
                result += char;
            } else if (/\s/.test(char)) {
                pendingSpace = true;
            } else {
                if (pendingSpace && result && !result.endsWith('<') && !result.endsWith(' ')) result += ' ';
                pendingSpace = false;
                result += char;
            }
        }
        return result;
    }

    function tokenizeMyBatisXml(input) {
        const source = String(input || '');
        const tokens = [];
        let text = '';
        let index = 0;

        function pushText() {
            if (text) tokens.push({ type: 'text', value: text });
            text = '';
        }

        while (index < source.length) {
            if (source.startsWith('<![CDATA[', index)) {
                const end = source.indexOf(']]>', index + 9);
                const closing = end < 0 ? source.length : end + 3;
                text += source.slice(index, closing);
                index = closing;
                continue;
            }
            if (source.startsWith('<!--', index)) {
                pushText();
                const end = source.indexOf('-->', index + 4);
                const closing = end < 0 ? source.length : end + 3;
                tokens.push({ type: 'tag', value: source.slice(index, closing), comment: true });
                index = closing;
                continue;
            }
            if (source[index] !== '<' || !/[A-Za-z_!?/]/.test(source[index + 1] || '')) {
                text += source[index];
                index += 1;
                continue;
            }

            let quote = '';
            let end = index + 1;
            for (; end < source.length; end += 1) {
                const char = source[end];
                if (quote) {
                    if (char === quote) quote = '';
                } else if (char === '\'' || char === '"') {
                    quote = char;
                } else if (char === '>') {
                    break;
                }
            }
            if (end >= source.length) {
                text += source.slice(index);
                break;
            }
            pushText();
            tokens.push({ type: 'tag', value: source.slice(index, end + 1) });
            index = end + 1;
        }
        pushText();
        return tokens;
    }

    function parenthesisDelta(line) {
        let delta = 0;
        let quote = '';
        for (let index = 0; index < line.length; index += 1) {
            const char = line[index];
            const previous = line[index - 1];
            if (quote) {
                if (char === quote && previous !== '\\') quote = '';
            } else if (char === '\'' || char === '"' || char === '`') {
                quote = char;
            } else if (char === '(') {
                delta += 1;
            } else if (char === ')') {
                delta -= 1;
            }
        }
        return delta;
    }

    function appendFormattedSql(lines, sql, depth) {
        const cdataBlocks = [];
        const protectedSql = String(sql || '')
            .replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, (block) => {
                const token = `__MYBATIS_CDATA_${cdataBlocks.length}__`;
                cdataBlocks.push(block);
                return token;
            })
            .replace(/\s+/g, ' ')
            .trim();
        const formatted = formatPlainSql(protectedSql);
        let sqlDepth = 0;
        formatted.split('\n').forEach((rawLine) => {
            const line = rawLine.trim().replace(/__MYBATIS_CDATA_(\d+)__/g, (_, index) => cdataBlocks[Number(index)]);
            if (!line) return;
            const leadingClosings = (line.match(/^\)+/) || [''])[0].length;
            const lineDepth = Math.max(0, sqlDepth - leadingClosings);
            lines.push(`${'  '.repeat(depth + lineDepth)}${line}`);
            sqlDepth = Math.max(0, sqlDepth + parenthesisDelta(line));
        });
    }

    function formatMyBatisSql(input) {
        const lines = [];
        let depth = 0;
        tokenizeMyBatisXml(input).forEach((token) => {
            if (token.type === 'text') {
                const content = token.value.trim();
                if (content) appendFormattedSql(lines, content, depth);
                return;
            }

            const tag = token.comment ? token.value.trim() : normalizeXmlTag(token.value);
            const closing = /^<\//.test(tag);
            const selfClosing = /\/\s*>$/.test(tag) || /^<\?/.test(tag) || /^<!/.test(tag);
            if (closing) depth = Math.max(0, depth - 1);
            lines.push(`${'  '.repeat(depth)}${tag}`);
            if (!closing && !selfClosing) depth += 1;
        });
        return lines.join('\n');
    }

    function formatPlainSql(input) {
        const raw = String(input || '').trim();
        if (!raw) return '';

        const leading = splitLeadingComments(raw);
        const templateParameters = [];
        let sql = stripSqlComments(leading.sql)
            .replace(/(?:#|\$)\{[^{}]+\}/g, (value) => {
                const token = `__MYBATIS_PARAMETER_${templateParameters.length}__`;
                templateParameters.push(value);
                return token;
            })
            .replace(/\s+/g, ' ')
            .trim();
        const restoreTemplateParameters = (value) => value.replace(/__MYBATIS_PARAMETER_(\d+)__/g, (_, index) => templateParameters[Number(index)]);
        sql = normalizeOperators(sql);
        sql = uppercaseKeywords(sql);

        const createTable = formatCreateTable(sql);
        if (createTable) {
            return restoreTemplateParameters([...leading.comments, createTable].join('\n'));
        }

        ['GROUP BY', 'ORDER BY', 'UNION ALL', 'INSERT INTO', 'DELETE FROM'].forEach((phrase) => {
            sql = protectPhrase(sql, phrase);
        });

        CLAUSES.forEach((phrase) => {
            const token = phrase.replace(/\s+/g, '_');
            sql = sql.replace(new RegExp(`\\s*\\b${token}\\b\\s*`, 'g'), `\n${token} `);
        });

        sql = sql
            .replace(/\s+\b(JOIN|LEFT JOIN|RIGHT JOIN|INNER JOIN|FULL JOIN|CROSS JOIN)\b\s+/g, '\n$1 ')
            .replace(/\s+\bON\b\s+/g, '\n  ON ')
            .replace(/\s+\bAND\b\s+/g, '\n  AND ')
            .replace(/\s+\bOR\b\s+/g, '\n  OR ')
            .replace(/\n\s*\n+/g, '\n')
            .trim();

        sql = transformTopLevelCommas(sql, ',\n  ');

        ['GROUP BY', 'ORDER BY', 'UNION ALL', 'INSERT INTO', 'DELETE FROM'].forEach((phrase) => {
            sql = restorePhrase(sql, phrase);
        });

        return restoreTemplateParameters(sql);
    }

    function formatSql(input) {
        return isMyBatisSql(input) ? formatMyBatisSql(input) : formatPlainSql(input);
    }

    function compressSql(input) {
        return stripSqlComments(input).replace(/\s+/g, ' ').trim();
    }

    function cleanTableName(name) {
        return String(name || '')
            .replace(/^[`"\[]|[`"\]]$/g, '')
            .replace(/[;,)]$/, '');
    }

    function sqlTextOnly(input) {
        if (!isMyBatisSql(input)) return String(input || '');
        return tokenizeMyBatisXml(input)
            .filter((token) => token.type === 'text')
            .map((token) => token.value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1'))
            .join(' ');
    }

    function extractTableNames(input) {
        const sql = stripSqlComments(sqlTextOnly(input));
        const tables = [];
        const seen = new Set();
        const pattern = /\b(?:create\s+table(?:\s+if\s+not\s+exists)?|alter\s+table|from|join|update|insert\s+into)\s+(\$\{[^{}]+\}|[`"\[]?[\w.$-]+[`"\]]?)/gi;
        let match;
        while ((match = pattern.exec(sql))) {
            const name = cleanTableName(match[1]);
            const key = name.toLowerCase();
            if (name && !seen.has(key) && !/^select$/i.test(name)) {
                seen.add(key);
                tables.push(name);
            }
        }
        return tables;
    }

    function extractPlaceholders(input) {
        const sql = stripSqlComments(sqlTextOnly(input));
        const placeholders = [];
        const seen = new Set();
        const pattern = /(\$\{[^{}]+\}|#\{[^{}]+\}|\$\d+|:[A-Za-z_][\w.]*|\?)/g;
        let match;
        while ((match = pattern.exec(sql))) {
            const value = match[1];
            const prev = sql[match.index - 1];
            if (value.startsWith(':') && prev === ':') {
                continue;
            }
            if (!seen.has(value)) {
                seen.add(value);
                placeholders.push(value);
            }
        }
        return placeholders;
    }

    return {
        stripSqlComments,
        isMyBatisSql,
        formatMyBatisSql,
        formatSql,
        compressSql,
        extractTableNames,
        extractPlaceholders,
    };
});
