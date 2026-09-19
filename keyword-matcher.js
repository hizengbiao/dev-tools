(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }
    root.KeywordMatcher = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    const DEFAULT_OPTIONS = Object.freeze({
        caseSensitive: false,
        matchMode: 'contains',
        deduplicateKeywords: false,
    });

    function normalizeOptions(options = {}) {
        return {
            caseSensitive: options.caseSensitive === true,
            matchMode: options.matchMode === 'exact' ? 'exact' : 'contains',
            deduplicateKeywords: options.deduplicateKeywords === true,
        };
    }

    function comparisonKey(value, caseSensitive) {
        return caseSensitive ? value : value.toLowerCase();
    }

    function parseLines(value, options = {}) {
        const settings = normalizeOptions(options);
        const seen = new Set();
        return String(value ?? '')
            .split(/\r\n|\n|\r/)
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .filter(line => {
                if (!settings.deduplicateKeywords) return true;
                const key = comparisonKey(line, settings.caseSensitive);
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });
    }

    function escapeRegExp(value) {
        return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function isExactMatch(content, keyword, caseSensitive) {
        if (caseSensitive) return content === keyword;
        return comparisonKey(content, false) === comparisonKey(keyword, false);
    }

    function findLiteralRanges(content, keyword, options = {}) {
        const settings = normalizeOptions(options);
        if (!keyword) return [];
        if (settings.matchMode === 'exact') {
            return isExactMatch(content, keyword, settings.caseSensitive)
                ? [{ start: 0, end: content.length }]
                : [];
        }

        const matcher = new RegExp(escapeRegExp(keyword), settings.caseSensitive ? 'g' : 'gi');
        const ranges = [];
        let match;
        while ((match = matcher.exec(content)) !== null) {
            ranges.push({ start: match.index, end: match.index + match[0].length });
            if (match[0].length === 0) matcher.lastIndex += 1;
        }
        return ranges;
    }

    function mergeRanges(ranges) {
        const sorted = ranges
            .filter(range => Number.isInteger(range.start) && Number.isInteger(range.end) && range.end > range.start)
            .sort((left, right) => left.start - right.start || left.end - right.end);
        const merged = [];
        sorted.forEach((range) => {
            const previous = merged[merged.length - 1];
            if (!previous || range.start > previous.end) {
                merged.push({ start: range.start, end: range.end });
                return;
            }
            previous.end = Math.max(previous.end, range.end);
        });
        return merged;
    }

    function matchBatch(keywordInput, contentInput, options = {}) {
        const settings = normalizeOptions(options);
        const keywords = parseLines(keywordInput, {
            ...settings,
            deduplicateKeywords: settings.deduplicateKeywords,
        });
        const contents = parseLines(contentInput);
        const keywordResults = keywords.map(text => ({
            text,
            matched: false,
            contentIndexes: [],
        }));
        const contentResults = contents.map(text => ({
            text,
            matched: false,
            keywordIndexes: [],
            ranges: [],
        }));

        keywordResults.forEach((keywordResult, keywordIndex) => {
            contentResults.forEach((contentResult, contentIndex) => {
                const ranges = findLiteralRanges(contentResult.text, keywordResult.text, settings);
                if (ranges.length === 0) return;
                keywordResult.matched = true;
                keywordResult.contentIndexes.push(contentIndex);
                contentResult.matched = true;
                contentResult.keywordIndexes.push(keywordIndex);
                contentResult.ranges.push(...ranges);
            });
        });

        contentResults.forEach((contentResult) => {
            contentResult.ranges = mergeRanges(contentResult.ranges);
        });

        const matchedKeywords = keywordResults.filter(item => item.matched).length;
        const matchedContents = contentResults.filter(item => item.matched).length;
        return {
            options: settings,
            keywordResults,
            contentResults,
            stats: {
                keywordTotal: keywordResults.length,
                matchedKeywords,
                unmatchedKeywords: keywordResults.length - matchedKeywords,
                contentTotal: contentResults.length,
                matchedContents,
                unmatchedContents: contentResults.length - matchedContents,
            },
        };
    }

    function formatResults(result) {
        if (!result) return '';
        const keywordLines = result.keywordResults.map(item =>
            `${item.matched ? '已匹配' : '未匹配'}\t${item.text}\t命中内容 ${item.contentIndexes.length} 条`
        );
        const contentLines = result.contentResults.map(item =>
            `${item.matched ? '已匹配' : '未匹配'}\t${item.text}\t命中关键词 ${item.keywordIndexes.length} 个`
        );
        return [
            '【匹配关键词】',
            ...keywordLines,
            '',
            '【原始内容】',
            ...contentLines,
        ].join('\n');
    }

    function escapeCsv(value) {
        return `"${String(value ?? '').replace(/"/g, '""')}"`;
    }

    function buildCsv(result) {
        if (!result) return '';
        const rows = [['类型', '序号', '状态', '文本', '匹配数量']];
        result.keywordResults.forEach((item, index) => {
            rows.push(['关键词', index + 1, item.matched ? '已匹配' : '未匹配', item.text, item.contentIndexes.length]);
        });
        result.contentResults.forEach((item, index) => {
            rows.push(['原始内容', index + 1, item.matched ? '已匹配' : '未匹配', item.text, item.keywordIndexes.length]);
        });
        return '\uFEFF' + rows.map(row => row.map(escapeCsv).join(',')).join('\r\n');
    }

    return {
        DEFAULT_OPTIONS,
        parseLines,
        findLiteralRanges,
        mergeRanges,
        matchBatch,
        formatResults,
        buildCsv,
    };
});
