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

    function formatSql(input) {
        const raw = String(input || '').trim();
        if (!raw) return '';

        let sql = stripSqlComments(raw).replace(/\s+/g, ' ').trim();
        sql = normalizeOperators(sql);
        sql = uppercaseKeywords(sql);

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
            .replace(/,\s*/g, ',\n  ')
            .replace(/\n\s*\n+/g, '\n')
            .trim();

        ['GROUP BY', 'ORDER BY', 'UNION ALL', 'INSERT INTO', 'DELETE FROM'].forEach((phrase) => {
            sql = restorePhrase(sql, phrase);
        });

        return sql;
    }

    function compressSql(input) {
        return stripSqlComments(input).replace(/\s+/g, ' ').trim();
    }

    function cleanTableName(name) {
        return String(name || '')
            .replace(/^[`"\[]|[`"\]]$/g, '')
            .replace(/[;,)]$/, '');
    }

    function extractTableNames(input) {
        const sql = stripSqlComments(input);
        const tables = [];
        const seen = new Set();
        const patterns = [
            /\bfrom\s+([`"\[]?[\w.$-]+[`"\]]?)/gi,
            /\bjoin\s+([`"\[]?[\w.$-]+[`"\]]?)/gi,
            /\bupdate\s+([`"\[]?[\w.$-]+[`"\]]?)/gi,
            /\binsert\s+into\s+([`"\[]?[\w.$-]+[`"\]]?)/gi,
        ];

        patterns.forEach((pattern) => {
            let match;
            while ((match = pattern.exec(sql))) {
                const name = cleanTableName(match[1]);
                const key = name.toLowerCase();
                if (name && !seen.has(key) && !/^select$/i.test(name)) {
                    seen.add(key);
                    tables.push(name);
                }
            }
        });
        return tables;
    }

    function extractPlaceholders(input) {
        const sql = stripSqlComments(input);
        const placeholders = [];
        const seen = new Set();
        const pattern = /(\$\{[\w.]+\}|#\{[\w.]+\}|\$\d+|:[A-Za-z_][\w.]*|\?)/g;
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
        formatSql,
        compressSql,
        extractTableNames,
        extractPlaceholders,
    };
});
