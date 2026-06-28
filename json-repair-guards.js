(function (root) {
    function looksLikeCodeStringConcatenation(raw) {
        return /["']\s*(?:\r?\n\s*)?\+\s*["']/.test(raw) ||
            /(?:^|\r?\n)\s*\+\s*["']/.test(raw);
    }

    function looksLikeRegexSnippet(raw) {
        const hasRegexOperators = /(\[[^\]]*\\[dDsSwW][^\]]*\]|\|[^|\r\n]+|\\[dDsSwWbB])/.test(raw);
        const hasJsonShape = /^\s*[\[{]/.test(raw) || /["'][^"']+["']\s*:/.test(raw);
        const hasCodeShape = /^[("']/.test(raw) || /["']\s*(?:\r?\n\s*)?\+\s*["']/.test(raw);

        return hasRegexOperators && hasCodeShape && !hasJsonShape;
    }

    function shouldSkipJsonRepair(raw) {
        const trimmed = String(raw || '').trim();
        if (!trimmed) return false;

        return looksLikeCodeStringConcatenation(trimmed) || looksLikeRegexSnippet(trimmed);
    }

    const api = {
        shouldSkipJsonRepair,
        looksLikeCodeStringConcatenation,
        looksLikeRegexSnippet
    };

    root.JsonRepairGuards = api;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
})(typeof window !== 'undefined' ? window : globalThis);
