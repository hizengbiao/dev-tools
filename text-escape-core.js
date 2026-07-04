(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.TextEscapeCore = factory();
    }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    function hasWrappedQuote(text) {
        return (text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"));
    }

    function readQuotedString(raw, start) {
        const quote = raw[start];
        let index = start + 1;
        let escaped = false;
        let literal = quote;

        while (index < raw.length) {
            const char = raw[index];
            literal += char;

            if (escaped) {
                escaped = false;
            } else if (char === '\\') {
                escaped = true;
            } else if (char === quote) {
                return { literal, end: index + 1 };
            }

            index += 1;
        }

        return null;
    }

    function stripWrappedQuote(text) {
        const trimmed = text.trim();
        if (trimmed.length >= 2 && hasWrappedQuote(trimmed) && readQuotedString(trimmed, 0)?.end === trimmed.length) {
            return trimmed.slice(1, -1);
        }

        return text;
    }

    function normalizeLanguageMode(options) {
        if (typeof options === 'string') {
            return options;
        }

        return options && options.languageMode || 'default';
    }

    function fromCodePoint(hex) {
        const codePoint = parseInt(hex, 16);
        if (!Number.isFinite(codePoint)) {
            return '';
        }

        try {
            return String.fromCodePoint(codePoint);
        } catch (error) {
            return '';
        }
    }

    function decodeUnicodeEscapes(text, mode = 'default') {
        let decoded = text.replace(/\\u([0-9a-fA-F]{4})/g, (_, code) => {
            return String.fromCharCode(parseInt(code, 16));
        });

        if (mode === 'javascript') {
            decoded = decoded.replace(/\\u\{([0-9a-fA-F]{1,6})\}/g, (_, code) => fromCodePoint(code));
        }

        if (mode === 'python') {
            decoded = decoded
                .replace(/\\U([0-9a-fA-F]{8})/g, (_, code) => fromCodePoint(code))
                .replace(/\\u([0-9a-fA-F]{4})/g, (_, code) => String.fromCharCode(parseInt(code, 16)));
        }

        if (mode === 'javascript' || mode === 'python') {
            decoded = decoded.replace(/\\x([0-9a-fA-F]{2})/g, (_, code) => {
                return String.fromCharCode(parseInt(code, 16));
            });
        }

        return decoded;
    }

    function decodeCommonEscapes(text, options = {}) {
        const mode = normalizeLanguageMode(options);
        const withoutQuotes = stripWrappedQuote(text);
        if (mode === 'sql') {
            return withoutQuotes.replace(/''/g, "'");
        }

        const withUnicode = decodeUnicodeEscapes(withoutQuotes, mode);

        return withUnicode
            .replace(/\\\\/g, '\u0000')
            .replace(/\\r\\n/g, '\n')
            .replace(/\\n/g, '\n')
            .replace(/\\r/g, '\n')
            .replace(/\\t/g, '\t')
            .replace(/\\"/g, '"')
            .replace(/\\'/g, "'")
            .replace(/\u0000/g, '\\');
    }

    function decodeStringLiteralForMerge(text) {
        const withoutQuotes = stripWrappedQuote(text);
        return withoutQuotes
            .replace(/\\\\/g, '\u0000')
            .replace(/\\"/g, '"')
            .replace(/\\'/g, "'")
            .replace(/\u0000/g, '\\');
    }

    function improveStackLikeLineBreaks(text) {
        return text
            .replace(/\s+at\s+([a-zA-Z_$][\w$]*(?:\.[\w$]+)+\()/g, '\n\tat $1')
            .replace(/\s+Caused by:/g, '\nCaused by:')
            .replace(/\s+Suppressed:/g, '\nSuppressed:')
            .replace(/\s+\.\.\.\s+(\d+\s+more)/g, '\n\t... $1');
    }

    function tokenizeStringExpression(raw) {
        const tokens = [];
        let index = 0;

        while (index < raw.length) {
            const char = raw[index];

            if (/\s/.test(char)) {
                index += 1;
                continue;
            }

            if (char === '+' || char === '＋') {
                tokens.push({ type: 'plus', text: '+' });
                index += 1;
                continue;
            }

            if (char === '"' || char === "'") {
                const token = readQuotedString(raw, index);
                if (!token) {
                    tokens.push({ type: 'other', text: raw.slice(index) });
                    break;
                }

                tokens.push({
                    type: 'string',
                    text: token.literal,
                    value: decodeStringLiteralForMerge(token.literal)
                });
                index = token.end;
                continue;
            }

            let end = index + 1;
            while (end < raw.length && !/\s/.test(raw[end]) && raw[end] !== '+' && raw[end] !== '＋' && raw[end] !== '"' && raw[end] !== "'") {
                end += 1;
            }

            tokens.push({ type: 'other', text: raw.slice(index, end) });
            index = end;
        }

        return tokens;
    }

    function getReadableDecodeSource(raw) {
        const tokens = tokenizeStringExpression(raw);
        if (!tokens.length || tokens.some((token) => token.type === 'other')) {
            return raw;
        }

        let value = '';
        let expectString = true;
        let hasString = false;

        for (const token of tokens) {
            if (expectString) {
                if (token.type !== 'string') {
                    return raw;
                }
                value += token.value;
                hasString = true;
                expectString = false;
                continue;
            }

            if (token.type === 'plus') {
                expectString = true;
                continue;
            }

            if (token.type === 'string') {
                value += token.value;
                continue;
            }

            return raw;
        }

        return hasString && !expectString ? value : raw;
    }

    function decodeToReadableText(raw, options = {}) {
        const decoded = decodeCommonEscapes(getReadableDecodeSource(raw), options);
        return improveStackLikeLineBreaks(decoded);
    }

    function encodeToEscapedString(raw, options = {}) {
        const mode = normalizeLanguageMode(options);
        if (mode === 'sql') {
            return raw.replace(/'/g, "''");
        }

        return raw
            .replace(/\\/g, '\\\\')
            .replace(/\r\n/g, '\\n')
            .replace(/\r/g, '\\n')
            .replace(/\n/g, '\\n')
            .replace(/\t/g, '\\t')
            .replace(/"/g, '\\"');
    }

    function normalizeMappingPairs(pairs) {
        if (!Array.isArray(pairs)) {
            return [];
        }

        const seen = new Set();
        return pairs.reduce((result, pair) => {
            const left = String(pair && pair.left || '').trim();
            const right = String(pair && pair.right || '').trim();
            if (!left || !right || left === right) {
                return result;
            }

            const key = [left, right].sort().join('\u0000');
            if (seen.has(key)) {
                return result;
            }

            seen.add(key);
            result.push({ left, right });
            return result;
        }, []);
    }

    function parseLegacyMappings(raw) {
        if (typeof raw !== 'string') {
            return [];
        }

        return normalizeMappingPairs(raw.split(/\r\n|\r|\n/).map((line) => {
            const match = line.trim().match(/^(.+?)\s*(?:=>|=)\s*(.+)$/);
            return match ? { left: match[1], right: match[2] } : null;
        }).filter(Boolean));
    }

    function getBidirectionalLookup(mappings) {
        const lookup = new Map();
        normalizeMappingPairs(mappings).forEach((mapping) => {
            lookup.set(mapping.left, mapping.right);
            lookup.set(mapping.right, mapping.left);
        });
        return lookup;
    }

    function mergeConcatenatedStrings(raw, mappings = []) {
        const expressionMappings = getBidirectionalLookup(mappings);
        const tokens = tokenizeStringExpression(raw).map((token) => {
            if (token.type === 'other' && expressionMappings.has(token.text)) {
                return {
                    type: 'string',
                    text: token.text,
                    value: expressionMappings.get(token.text)
                };
            }

            return token;
        });
        if (tokens.length === 0) {
            return '';
        }

        const parts = [];
        let index = 0;

        while (index < tokens.length) {
            const token = tokens[index];

            if (token.type !== 'string') {
                parts.push(token.text);
                index += 1;
                continue;
            }

            let value = token.value;
            let next = index + 1;
            while (next + 1 < tokens.length && tokens[next].type === 'plus' && tokens[next + 1].type === 'string') {
                value += tokens[next + 1].value;
                next += 2;
            }

            while (next < tokens.length && tokens[next].type === 'string') {
                value += tokens[next].value;
                next += 1;
            }

            parts.push(value);
            index = next;
        }

        if (parts.length === 1) {
            return parts[0];
        }

        const lines = [];
        let expressionLine = '';

        parts.forEach((part) => {
            if (part === '+') {
                expressionLine = expressionLine ? `${expressionLine} +` : '+';
                return;
            }

            if (expressionLine) {
                if (/^[A-Za-z_$][\w$]*(?:[.)\]]*)$/.test(part)) {
                    expressionLine += ` ${part}`;
                    return;
                }

                lines.push(expressionLine);
                expressionLine = '';
            }

            lines.push(part);
        });

        if (expressionLine) {
            lines.push(expressionLine);
        }

        return lines.join('\n');
    }

    function restoreMappedVariables(raw, mappings) {
        const text = decodeCommonEscapes(raw);
        const availableMappings = [];
        normalizeMappingPairs(mappings).forEach((mapping) => {
            availableMappings.push({ source: mapping.left, replacement: mapping.right });
            availableMappings.push({ source: mapping.right, replacement: mapping.left });
        });
        availableMappings.sort((left, right) => right.source.length - left.source.length);

        if (!text || availableMappings.length === 0) {
            return text;
        }

        const parts = [];
        let literalStart = 0;
        let index = 0;

        while (index < text.length) {
            const mapping = availableMappings.find((item) => text.startsWith(item.source, index));
            if (!mapping) {
                index += 1;
                continue;
            }

            if (index > literalStart) {
                parts.push({
                    type: 'string',
                    value: text.slice(literalStart, index)
                });
            }

            parts.push({
                type: 'expression',
                value: mapping.replacement
            });
            index += mapping.source.length;
            literalStart = index;
        }

        if (literalStart < text.length) {
            parts.push({
                type: 'string',
                value: text.slice(literalStart)
            });
        }

        if (!parts.some((part) => part.type === 'expression')) {
            return text;
        }

        return parts.map((part) => {
            if (part.type === 'expression') {
                return part.value;
            }

            return `"${encodeToEscapedString(part.value)}"`;
        }).join(' + ');
    }

    function formatQuotedCopyText(text) {
        const value = String(text || '');
        const trimmed = value.trim();
        if (trimmed.length >= 2 && hasWrappedQuote(trimmed) && readQuotedString(trimmed, 0)?.end === trimmed.length) {
            return value;
        }

        return `"${value}"`;
    }

    return {
        decodeToReadableText,
        encodeToEscapedString,
        decodeStringLiteralForMerge,
        getReadableDecodeSource,
        formatQuotedCopyText,
        mergeConcatenatedStrings,
        normalizeMappingPairs,
        parseLegacyMappings,
        restoreMappedVariables,
        readQuotedString
    };
});
