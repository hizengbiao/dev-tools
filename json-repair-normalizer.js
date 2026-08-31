(function (global) {
    'use strict';

    function stripCommentsOutsideStrings(raw) {
        let result = '';
        let inString = false;
        let stringChar = '';
        let escaped = false;

        for (let i = 0; i < raw.length; i++) {
            const char = raw[i];
            const nextChar = raw[i + 1];

            if (inString) {
                result += char;
                if (escaped) {
                    escaped = false;
                } else if (char === '\\') {
                    escaped = true;
                } else if (char === stringChar) {
                    inString = false;
                }
                continue;
            }

            if (char === '"' || char === "'") {
                inString = true;
                stringChar = char;
                result += char;
                continue;
            }

            if (char === '/' && nextChar === '/') {
                i += 2;
                while (i < raw.length && raw[i] !== '\n' && raw[i] !== '\r') {
                    i++;
                }
                if (i < raw.length) {
                    result += raw[i];
                }
                continue;
            }

            if (char === '/' && nextChar === '*') {
                i += 2;
                while (i < raw.length - 1 && !(raw[i] === '*' && raw[i + 1] === '/')) {
                    i++;
                }
                if (i < raw.length - 1) {
                    i++;
                }
                continue;
            }

            result += char;
        }

        return result;
    }

    function fixChineseColons(raw) {
        const lines = raw.split('\n');
        const result = [];

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];
            const trimmedLine = line.trim();

            if (!trimmedLine ||
                /^[{}\[\],]+$/.test(trimmedLine) ||
                trimmedLine.startsWith('"') ||
                trimmedLine.startsWith('{') ||
                trimmedLine.startsWith('[')) {
                result.push(line);
                continue;
            }

            const chineseColonIndex = line.indexOf('：');
            const englishColonIndex = line.indexOf(':');

            let colonIndex = -1;

            if (chineseColonIndex !== -1 && (englishColonIndex === -1 || chineseColonIndex < englishColonIndex)) {
                colonIndex = chineseColonIndex;
            } else if (englishColonIndex !== -1) {
                colonIndex = englishColonIndex;
            }

            if (colonIndex !== -1) {
                let keyPart = line.substring(0, colonIndex).trim();
                let valuePart = line.substring(colonIndex + 1).trim();
                const leadingWhitespace = line.match(/^(\s*)/)[1];

                if (!keyPart.startsWith('"') && !keyPart.startsWith("'") && keyPart.length > 0) {
                    keyPart = '"' + keyPart + '"';

                    if (valuePart === '{' || valuePart === '[') {
                        line = leadingWhitespace + keyPart + ': ' + valuePart;
                    } else if (valuePart === '' || valuePart === '}' || valuePart === ']') {
                        line = leadingWhitespace + keyPart + ': ' + valuePart;
                    } else if (isCommasSeparatedNumbers(valuePart)) {
                        const numbers = valuePart.split(',').map(n => n.trim());
                        const jsonArray = JSON.stringify(numbers);
                        line = leadingWhitespace + keyPart + ': ' + jsonArray;
                    } else if (isJsonPrimitive(valuePart)) {
                        line = leadingWhitespace + keyPart + ': ' + valuePart;
                    } else {
                        if (!valuePart.startsWith('"') && !valuePart.startsWith("'") &&
                            !valuePart.startsWith('{') && !valuePart.startsWith('[')) {
                            valuePart = '"' + valuePart.replace(/"/g, '\\"') + '"';
                        }
                        line = leadingWhitespace + keyPart + ': ' + valuePart;
                    }
                }
            }

            result.push(line);
        }

        return result.join('\n');
    }

    function stripLeadingLabelBeforeJson(raw) {
        const source = String(raw || '');
        const trimmedSource = source.trimStart();
        if (trimmedSource.startsWith('{') || trimmedSource.startsWith('[')) {
            return source;
        }
        let inString = false;
        let stringChar = '';
        let escaped = false;

        for (let index = 0; index < source.length; index += 1) {
            const char = source[index];
            if (inString) {
                if (escaped) {
                    escaped = false;
                } else if (char === '\\') {
                    escaped = true;
                } else if (char === stringChar) {
                    inString = false;
                }
                continue;
            }
            if (char === '"' || char === "'") {
                inString = true;
                stringChar = char;
                continue;
            }
            if (char !== ':' && char !== '：') continue;

            const rest = source.slice(index + 1).trimStart();
            if (rest.startsWith('{') || rest.startsWith('[')) {
                return rest;
            }
        }
        return source;
    }

    function isCommasSeparatedNumbers(value) {
        if (!value.includes(',')) return false;

        const parts = value.split(',');
        if (parts.length < 2) return false;

        for (const part of parts) {
            const trimmed = part.trim();
            if (!/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(trimmed)) {
                return false;
            }
        }
        return true;
    }

    function isJsonPrimitive(value) {
        if (value === 'true' || value === 'false' || value === 'null') {
            return true;
        }
        return /^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(value);
    }

    function addMissingCommas(raw) {
        const lines = raw.split('\n');
        const result = [];

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];
            const trimmedLine = line.trim();

            if (!trimmedLine || /^[{}\[\]]+$/.test(trimmedLine)) {
                result.push(line);
                continue;
            }

            const endsWithComma = trimmedLine.endsWith(',');
            const endsWithOpenBracket = trimmedLine.endsWith('{') || trimmedLine.endsWith('[');
            const endsWithCloseBracket = trimmedLine.endsWith('}') || trimmedLine.endsWith(']');

            let nextNonEmptyLine = '';
            for (let j = i + 1; j < lines.length; j++) {
                const nextTrimmed = lines[j].trim();
                if (nextTrimmed) {
                    nextNonEmptyLine = nextTrimmed;
                    break;
                }
            }

            const nextLineStartsWithKey = /^["'@a-zA-Z_\u4e00-\u9fff]/.test(nextNonEmptyLine) ||
                /^[a-zA-Z_\-@]/.test(nextNonEmptyLine);
            const nextLineIsCloseBracket = /^[}\]]/.test(nextNonEmptyLine);

            if (!endsWithComma && !endsWithOpenBracket && !endsWithCloseBracket &&
                nextLineStartsWithKey && !nextLineIsCloseBracket &&
                trimmedLine.includes(':')) {
                line = line.trimEnd() + ',';
            }

            if (endsWithCloseBracket && !endsWithComma && nextLineStartsWithKey && !nextLineIsCloseBracket) {
                line = line.trimEnd() + ',';
            }

            result.push(line);
        }

        return result.join('\n');
    }

    function addQuotesToUnquotedStrings(raw) {
        if (raw.match(/^\s*\{\s*"/)) {
            return raw;
        }

        let result = '';
        let i = 0;
        let inString = false;
        let stringChar = '';

        while (i < raw.length) {
            const char = raw[i];

            if ((char === '"' || char === "'") && (i === 0 || raw[i - 1] !== '\\')) {
                if (!inString) {
                    inString = true;
                    stringChar = char;
                    result += '"';
                    i++;
                    continue;
                } else if (char === stringChar) {
                    inString = false;
                    result += '"';
                    i++;
                    continue;
                }
            }

            if (inString) {
                if (char === '"' && stringChar === "'") {
                    result += '\\"';
                } else {
                    result += char;
                }
                i++;
                continue;
            }

            if (/\s/.test(char)) {
                result += char;
                i++;
                continue;
            }

            if ('{}[],:'.includes(char)) {
                result += char;
                i++;
                continue;
            }

            let tokenEnd = i;
            while (tokenEnd < raw.length && !/[\s{}[\],:"]/.test(raw[tokenEnd])) {
                tokenEnd++;
            }
            if (tokenEnd === i) {
                result += char;
                i++;
                continue;
            }
            const token = raw.slice(i, tokenEnd);

            let afterToken = tokenEnd;
            while (afterToken < raw.length && /\s/.test(raw[afterToken])) {
                afterToken++;
            }
            const nextChar = raw[afterToken];
            const isKey = nextChar === ':';
            const isSpecialValue = /^(true|false|null|undefined|NaN|Infinity|-Infinity)$/.test(token);
            const isNumber = /^-?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(token);

            if (isKey) {
                result += '"' + token + '"';
            } else if (isSpecialValue) {
                if (token === 'undefined' || token === 'NaN' || token === 'Infinity' || token === '-Infinity') {
                    result += 'null';
                } else {
                    result += token;
                }
            } else if (isNumber) {
                result += token;
            } else {
                result += '"' + token.replace(/"/g, '\\"') + '"';
            }

            i = tokenEnd;
        }

        return result;
    }

    function decodeEscapedJsonLayer(raw) {
        let result = '';

        for (let i = 0; i < raw.length; i++) {
            const char = raw[i];
            const nextChar = raw[i + 1];

            if (char !== '\\' || nextChar === undefined) {
                result += char;
                continue;
            }

            if (nextChar === '\\') {
                result += '\\';
                i++;
            } else if (nextChar === '"') {
                result += '"';
                i++;
            } else if (nextChar === '_') {
                result += '_';
                i++;
            } else {
                result += char;
            }
        }

        return result;
    }

    function normalizeEscapedJsonContainer(raw, maxLayers = 4) {
        const source = String(raw || '');
        if (!/^\s*[\[{]/.test(source) || !source.includes('\\"')) {
            return source;
        }

        let candidate = source;
        for (let layer = 0; layer <= maxLayers; layer++) {
            try {
                JSON.parse(candidate);
                return candidate;
            } catch (error) {
                if (layer === maxLayers) break;
            }

            const decoded = decodeEscapedJsonLayer(candidate);
            if (decoded === candidate) break;
            candidate = decoded;
        }

        return source;
    }

    const api = {
        stripCommentsOutsideStrings,
        fixChineseColons,
        stripLeadingLabelBeforeJson,
        isCommasSeparatedNumbers,
        isJsonPrimitive,
        addMissingCommas,
        addQuotesToUnquotedStrings,
        decodeEscapedJsonLayer,
        normalizeEscapedJsonContainer,
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }

    global.JsonRepairNormalizer = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
