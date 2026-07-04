(function (root, factory) {
    const api = factory();

    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }

    root.RegexReplacementHelper = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    const EMPTY_MESSAGE = '没有可用的捕获分组。先添加括号分组并执行匹配，例如 (\\d+) 会生成 $1。';

    function getLineColumn(text, index) {
        const before = String(text || '').slice(0, index);
        const lines = before.split('\n');
        return {
            line: lines.length,
            column: lines[lines.length - 1].length + 1,
        };
    }

    function firstDefined(values) {
        return (values || []).find((value) => value !== undefined && value !== null) ?? '';
    }

    function buildReplacementGroups(matches, sourceText) {
        if (!matches || !matches.length) {
            return [];
        }

        const firstMatch = matches[0];
        const position = getLineColumn(sourceText, firstMatch.index);
        const groups = [];

        (firstMatch.groups || []).forEach((group, index) => {
            const sample = firstDefined(matches.map((match) => (match.groups || [])[index]));
            groups.push({
                token: `$${index + 1}`,
                label: `第 ${index + 1} 个捕获分组`,
                sample,
                source: firstMatch.text,
                line: position.line,
                column: position.column,
            });
        });

        Object.keys(firstMatch.namedGroups || {}).forEach((name) => {
            const sample = firstDefined(matches.map((match) => match.namedGroups && match.namedGroups[name]));
            groups.push({
                token: `$<${name}>`,
                label: `命名分组 ${name}`,
                sample,
                source: firstMatch.text,
                line: position.line,
                column: position.column,
            });
        });

        return groups;
    }

    function renderReplacementGroupsText(matches, sourceText) {
        const groups = buildReplacementGroups(matches, sourceText);

        if (!groups.length) {
            return EMPTY_MESSAGE;
        }

        return groups.map((group) => (
            `${group.token}\t${group.label}\t示例值：${group.sample}\t来源：第 ${group.line} 行第 ${group.column} 列 ${group.source}`
        )).join('\n');
    }

    return {
        buildReplacementGroups,
        renderReplacementGroupsText,
    };
});
