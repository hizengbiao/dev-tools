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

    function findMatchingIndexAt(text, index) {
        const char = text[index];
        if (bracketPairs[char]) {
            return findMatchingOpenBracket(text, index);
        }

        if (reversePairs[char]) {
            return findMatchingCloseBracket(text, index);
        }

        if (char === '"' || char === "'") {
            return findMatchingQuote(text, index);
        }

        return -1;
    }

    function findMatchingIndexAroundCursor(text, cursorPos) {
        if (typeof text !== 'string' || typeof cursorPos !== 'number') {
            return -1;
        }

        if (cursorPos > 0) {
            const beforeMatch = findMatchingIndexAt(text, cursorPos - 1);
            if (beforeMatch >= 0) {
                return beforeMatch;
            }
        }

        if (cursorPos < text.length) {
            return findMatchingIndexAt(text, cursorPos);
        }

        return -1;
    }

    function calculateHighlightOverlayStyle(position, textareaMetrics) {
        return {
            left: (textareaMetrics.offsetLeft + position.left - textareaMetrics.scrollLeft) + 'px',
            top: (textareaMetrics.offsetTop + position.top - textareaMetrics.scrollTop) + 'px',
            width: Math.max(position.width, 8) + 'px',
            height: position.height + 'px',
        };
    }

    function buildTextMirrorStyle(computedStyle, clientWidth) {
        return {
            position: 'absolute',
            visibility: 'hidden',
            whiteSpace: 'pre-wrap',
            wordWrap: 'break-word',
            fontFamily: computedStyle.fontFamily,
            fontSize: computedStyle.fontSize,
            lineHeight: computedStyle.lineHeight,
            padding: computedStyle.padding,
            width: clientWidth + 'px',
            boxSizing: 'border-box',
            left: '0',
            top: '0',
        };
    }

    return {
        findMatchingOpenBracket,
        findMatchingCloseBracket,
        findMatchingQuote,
        findMatchingIndexAroundCursor,
        calculateHighlightOverlayStyle,
        buildTextMirrorStyle,
    };
});
