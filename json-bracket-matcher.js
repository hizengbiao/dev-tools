(function (root, factory) {
    const api = factory();

    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }

    root.JsonBracketMatcher = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    const bracketPairs = {
        ')': '(',
        ']': '[',
        '}': '{',
    };
    const reversePairs = {
        '(': ')',
        '[': ']',
        '{': '}',
    };

    function isUnescapedQuote(text, index) {
        const char = text[index];
        if (char !== '"' && char !== "'") {
            return false;
        }

        let escapeCount = 0;
        for (let i = index - 1; i >= 0 && text[i] === '\\'; i--) {
            escapeCount++;
        }

        return escapeCount % 2 === 0;
    }

    function findMatchingOpenBracket(text, closeBracketPos) {
        const closeBracket = text[closeBracketPos];
        const openBracket = bracketPairs[closeBracket];
        if (!openBracket) {
            return -1;
        }

        let depth = 1;
        let inString = false;
        let stringChar = null;

        for (let i = closeBracketPos - 1; i >= 0; i--) {
            const char = text[i];

            if (isUnescapedQuote(text, i)) {
                if (inString && char === stringChar) {
                    inString = false;
                    stringChar = null;
                } else if (!inString) {
                    inString = true;
                    stringChar = char;
                }
                continue;
            }

            if (inString) {
                continue;
            }

            if (char === closeBracket) {
                depth++;
            } else if (char === openBracket) {
                depth--;
                if (depth === 0) {
                    return i;
                }
            }
        }

        return -1;
    }

    function findMatchingCloseBracket(text, openBracketPos) {
        const openBracket = text[openBracketPos];
        const closeBracket = reversePairs[openBracket];
        if (!closeBracket) {
            return -1;
        }

        let depth = 1;
        let inString = false;
        let stringChar = null;

        for (let i = openBracketPos + 1; i < text.length; i++) {
            const char = text[i];

            if (isUnescapedQuote(text, i)) {
                if (inString && char === stringChar) {
                    inString = false;
                    stringChar = null;
                } else if (!inString) {
                    inString = true;
                    stringChar = char;
                }
                continue;
            }

            if (inString) {
                continue;
            }

            if (char === openBracket) {
                depth++;
            } else if (char === closeBracket) {
                depth--;
                if (depth === 0) {
                    return i;
                }
            }
        }

        return -1;
    }

    function findMatchingQuote(text, quotePos) {
        const quoteChar = text[quotePos];
        if (quoteChar !== '"' && quoteChar !== "'") {
            return -1;
        }

        if (!isUnescapedQuote(text, quotePos)) {
            return -1;
        }

        let quoteCount = 0;
        for (let i = 0; i < quotePos; i++) {
            if (text[i] === quoteChar && isUnescapedQuote(text, i)) {
                quoteCount++;
            }
        }

        if (quoteCount % 2 === 0) {
            for (let i = quotePos + 1; i < text.length; i++) {
                if (text[i] === quoteChar && isUnescapedQuote(text, i)) {
                    return i;
                }
            }
        } else {
            for (let i = quotePos - 1; i >= 0; i--) {
                if (text[i] === quoteChar && isUnescapedQuote(text, i)) {
                    return i;
                }
            }
        }

        return -1;
    }

    return {
        findMatchingOpenBracket,
        findMatchingCloseBracket,
        findMatchingQuote,
    };
});
