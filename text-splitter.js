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

    function getClipboardHistoryWriteOrder(segments) {
        return Array.from(segments ?? []).reverse();
    }

    return {
        splitText,
        countCharacters,
        getClipboardHistoryWriteOrder,
    };
});
