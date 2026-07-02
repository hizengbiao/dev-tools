(function (root, factory) {
    const api = factory();

    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }

    root.RegexMatchExporter = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    const EMPTY_MESSAGE = '没有匹配结果可导出。';

    function getLineColumn(text, index) {
        const before = String(text || '').slice(0, index);
        const lines = before.split('\n');
        return {
            line: lines.length,
            column: lines[lines.length - 1].length + 1,
        };
    }

    function normalizeMatches(matches, sourceText) {
        return (matches || []).map((match, index) => {
            const position = getLineColumn(sourceText, match.index);
            const groups = (match.groups || []).map((group, groupIndex) => `$${groupIndex + 1}=${group ?? ''}`);

            return {
                no: index + 1,
                text: match.text,
                index: match.index,
                line: position.line,
                column: position.column,
                groups,
                namedGroups: match.namedGroups || null,
            };
        });
    }

    function maxGroupCount(matches) {
        return (matches || []).reduce((max, match) => Math.max(max, (match.groups || []).length), 0);
    }

    function csvCell(value) {
        const text = value == null ? '' : String(value);
        if (/[",\r\n]/.test(text)) {
            return `"${text.replace(/"/g, '""')}"`;
        }
        return text;
    }

    function tsvCell(value) {
        return (value == null ? '' : String(value)).replace(/\t/g, '    ').replace(/\r?\n/g, '\\n');
    }

    function exportMatchesAsJson(matches, sourceText) {
        if (!matches || !matches.length) {
            return EMPTY_MESSAGE;
        }

        return JSON.stringify(normalizeMatches(matches, sourceText), null, 2);
    }

    function exportMatchesAsCsv(matches, sourceText) {
        if (!matches || !matches.length) {
            return EMPTY_MESSAGE;
        }

        const groupCount = maxGroupCount(matches);
        const headers = ['no', 'text', 'index', 'line', 'column'];
        for (let index = 1; index <= groupCount; index += 1) {
            headers.push(`group${index}`);
        }
        headers.push('namedGroups');

        const rows = matches.map((match, index) => {
            const position = getLineColumn(sourceText, match.index);
            const cells = [
                index + 1,
                match.text,
                match.index,
                position.line,
                position.column,
            ];

            for (let groupIndex = 0; groupIndex < groupCount; groupIndex += 1) {
                cells.push((match.groups || [])[groupIndex] ?? '');
            }

            cells.push(match.namedGroups ? JSON.stringify(match.namedGroups) : '');
            return cells.map(csvCell).join(',');
        });

        return [headers.join(','), ...rows].join('\n');
    }

    function exportMatchesAsGroupColumns(matches, sourceText) {
        if (!matches || !matches.length) {
            return EMPTY_MESSAGE;
        }

        const groupCount = maxGroupCount(matches);
        const headers = ['序号', '匹配内容', '起始位置', '行', '列'];
        for (let index = 1; index <= groupCount; index += 1) {
            headers.push(`$${index}`);
        }
        headers.push('命名分组');

        const rows = matches.map((match, index) => {
            const position = getLineColumn(sourceText, match.index);
            const cells = [
                index + 1,
                match.text,
                match.index,
                position.line,
                position.column,
            ];

            for (let groupIndex = 0; groupIndex < groupCount; groupIndex += 1) {
                cells.push((match.groups || [])[groupIndex] ?? '');
            }

            cells.push(match.namedGroups ? JSON.stringify(match.namedGroups) : '');
            return cells.map(tsvCell).join('\t');
        });

        return [headers.join('\t'), ...rows].join('\n');
    }

    return {
        exportMatchesAsJson,
        exportMatchesAsCsv,
        exportMatchesAsGroupColumns,
    };
});
