(function (root, factory) {
    const api = factory();

    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }

    root.TextSplitter = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    const PUNCTUATION = new Set([
        '.', ',', ';', ':', '!', '?',
        '。', '，', '；', '：', '！', '？',
        '、', '…', '—', '-', ')', '）', ']', '】', '}', '》', '”', '’'
    ]);

    function isNaturalBoundary(char) {
        return /\s/u.test(char) || PUNCTUATION.has(char);
    }

    function findBreakIndex(characters, maxLength) {
        const preferredStart = Math.max(1, Math.floor(maxLength * 0.55));

        for (let index = maxLength; index >= preferredStart; index -= 1) {
            if (isNaturalBoundary(characters[index - 1])) {
                return index;
            }
        }

        return maxLength;
    }

    function splitText(text, maxLength) {
        if (!Number.isInteger(maxLength) || maxLength <= 0) {
            throw new TypeError('maxLength must be a positive integer');
        }

        const source = String(text ?? '');
        if (!source) {
            return [];
        }

        const remaining = Array.from(source);
        const segments = [];

        while (remaining.length > maxLength) {
            const breakIndex = findBreakIndex(remaining, maxLength);
            segments.push(remaining.splice(0, breakIndex).join(''));
        }

        if (remaining.length) {
            segments.push(remaining.join(''));
        }

        return segments;
    }

    function countCharacters(text) {
        return Array.from(String(text ?? '')).length;
    }

    function estimateTokens(text) {
        const source = String(text ?? '');
        if (!source) return 0;
        let tokens = 0;
        const matches = source.match(/[\p{Script=Han}]|[A-Za-z0-9_]+|[^\s]/gu) || [];
        for (const part of matches) {
            if (/^[A-Za-z0-9_]+$/u.test(part)) {
                tokens += Math.ceil(part.length / 4);
            } else {
                tokens += 1;
            }
        }
        return tokens;
    }

    function splitTextByEstimatedTokens(text, maxTokens) {
        if (!Number.isInteger(maxTokens) || maxTokens <= 0) {
            throw new TypeError('maxTokens must be a positive integer');
        }

        const source = String(text ?? '');
        if (!source) {
            return [];
        }

        const characters = Array.from(source);
        const segments = [];
        let start = 0;

        while (start < characters.length) {
            let end = start;
            let lastNaturalEnd = start;
            while (end < characters.length) {
                const next = characters.slice(start, end + 1).join('');
                if (estimateTokens(next) > maxTokens) break;
                end += 1;
                if (isNaturalBoundary(characters[end - 1])) {
                    lastNaturalEnd = end;
                }
            }

            if (end >= characters.length) {
                segments.push(characters.slice(start).join(''));
                break;
            }

            const preferredStart = start + Math.max(1, Math.floor((end - start) * 0.55));
            const breakIndex = lastNaturalEnd >= preferredStart ? lastNaturalEnd : Math.max(start + 1, end);
            segments.push(characters.slice(start, breakIndex).join(''));
            start = breakIndex;
        }

        return segments;
    }

    function getClipboardHistoryWriteOrder(segments) {
        return Array.from(segments ?? []).reverse();
    }

    return {
        splitText,
        countCharacters,
        estimateTokens,
        splitTextByEstimatedTokens,
        getClipboardHistoryWriteOrder,
    };
});
