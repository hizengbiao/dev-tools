(function (global) {
    'use strict';

    function normalizeJavaStyleObject(raw) {
        const trimmed = raw.trim();
        if (!looksLikeJavaStyleObject(trimmed)) {
            return raw;
        }

        let result = normalizeJavaObjectParentheses(trimmed);
        result = stripJavaClassPrefixes(result);
        result = removeDanglingSingleQuotesOutsideStrings(result);
        result = quoteJavaListValuesOutsideStrings(result);
        result = quoteJavaMapValuesOutsideStrings(result);
        result = replaceEqualsOutsideStrings(result);
        return result;
    }

    function looksLikeJavaStyleObject(raw) {
        return /^\s*[A-Za-z_$][A-Za-z0-9_$]*\s*\{/.test(raw) ||
            /^\s*\[\s*[A-Za-z_$][A-Za-z0-9_$]*\s*\{/.test(raw) ||
            hasUnquotedEquals(raw);
    }

    function looksLikeJavaClassObject(raw) {
        return /^\s*(?:\[\s*)?[A-Za-z_$][A-Za-z0-9_$]*\s*[({]/.test(String(raw || ''));
    }

    function hasUnquotedEquals(raw) {
        let inString = false;
        let stringChar = '';
        let escaped = false;

        for (let i = 0; i < raw.length; i++) {
            const char = raw[i];

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

            if (char === '=') {
                return true;
            }
        }

        return false;
    }

    function normalizeJavaObjectParentheses(raw) {
        let result = '';
        let i = 0;

        while (i < raw.length) {
            const char = raw[i];
            if (char === '"' || char === "'") {
                const stringEnd = findStringEnd(raw, i, char);
                result += raw.slice(i, stringEnd);
                i = stringEnd;
                continue;
            }

            const classMatch = raw.slice(i).match(/^([A-Za-z_$][A-Za-z0-9_$]*)\s*\(/);
            const previousIndex = findPreviousNonWhitespace(raw, i - 1);
            const allowedStart = previousIndex === -1 || /[=:\[,{(]/.test(raw[previousIndex]);

            if (classMatch && allowedStart) {
                const openIndex = i + classMatch[0].lastIndexOf('(');
                const closeIndex = findMatchingParenthesis(raw, openIndex);
                if (closeIndex !== -1) {
                    const inner = raw.slice(openIndex + 1, closeIndex);
                    if (hasTopLevelEquals(inner)) {
                        result += '{' + normalizeJavaObjectParentheses(inner) + '}';
                        i = closeIndex + 1;
                        continue;
                    }
                }
            }

            result += char;
            i++;
        }

        return result;
    }

    function findStringEnd(raw, start, quote) {
        let escaped = false;
        for (let i = start + 1; i < raw.length; i++) {
            const char = raw[i];
            if (escaped) {
                escaped = false;
            } else if (char === '\\') {
                escaped = true;
            } else if (char === quote) {
                return i + 1;
            }
        }
        return raw.length;
    }

    function findMatchingParenthesis(raw, openIndex) {
        let depth = 0;
        let inString = false;
        let stringChar = '';
        let escaped = false;

        for (let i = openIndex; i < raw.length; i++) {
            const char = raw[i];
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
            } else if (char === '(') {
                depth++;
            } else if (char === ')' && --depth === 0) {
                return i;
            }
        }

        return -1;
    }

    function hasTopLevelEquals(raw) {
        let depth = 0;
        let inString = false;
        let stringChar = '';
        let escaped = false;

        for (let i = 0; i < raw.length; i++) {
            const char = raw[i];
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
            } else if (char === '{' || char === '[' || char === '(') {
                depth++;
            } else if (char === '}' || char === ']' || char === ')') {
                depth = Math.max(0, depth - 1);
            } else if (char === '=' && depth === 0) {
                return true;
            }
        }

        return false;
    }

    function quoteJavaMapValuesOutsideStrings(raw) {
        let result = '';
        let i = 0;
        let inString = false;
        let stringChar = '';
        let escaped = false;

        while (i < raw.length) {
            const char = raw[i];

            if (inString) {
                result += char;
                if (escaped) {
                    escaped = false;
                } else if (char === '\\') {
                    escaped = true;
                } else if (char === stringChar) {
                    inString = false;
                }
                i++;
                continue;
            }

            if (char === '"' || char === "'") {
                inString = true;
                stringChar = char;
                result += char;
                i++;
                continue;
            }

            if (char !== '=') {
                result += char;
                i++;
                continue;
            }

            result += char;
            i++;

            const nextIndex = findNextNonWhitespace(raw, i);
            if (nextIndex !== -1 && /["'{\[]/.test(raw[nextIndex])) {
                continue;
            }

            const valueEnd = findJavaMapValueEnd(raw, i);
            const valueText = raw.slice(i, valueEnd);
            result += shouldQuoteJavaMapValue(valueText) ? quoteJavaMapValue(valueText) : valueText;
            i = valueEnd;
        }

        return result;
    }

    function quoteJavaListValuesOutsideStrings(raw) {
        let result = '';
        let i = 0;

        while (i < raw.length) {
            const char = raw[i];
            if (char === '"' || char === "'") {
                const stringEnd = findStringEnd(raw, i, char);
                result += raw.slice(i, stringEnd);
                i = stringEnd;
                continue;
            }

            if (char !== '[') {
                result += char;
                i++;
                continue;
            }

            const closeIndex = findMatchingSquareBracket(raw, i);
            if (closeIndex === -1) {
                result += char;
                i++;
                continue;
            }

            const inner = raw.slice(i + 1, closeIndex);
            result += '[' + splitTopLevelItems(inner).map(normalizeJavaListItem).join(',') + ']';
            i = closeIndex + 1;
        }

        return result;
    }

    function findMatchingSquareBracket(raw, openIndex) {
        let depth = 0;
        let inString = false;
        let stringChar = '';
        let escaped = false;

        for (let i = openIndex; i < raw.length; i++) {
            const char = raw[i];
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
            } else if (char === '[') {
                depth++;
            } else if (char === ']' && --depth === 0) {
                return i;
            }
        }

        return -1;
    }

    function splitTopLevelItems(raw) {
        const items = [];
        let start = 0;
        let depth = 0;
        let inString = false;
        let stringChar = '';
        let escaped = false;

        for (let i = 0; i < raw.length; i++) {
            const char = raw[i];
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
            } else if (char === '{' || char === '[' || char === '(') {
                depth++;
            } else if (char === '}' || char === ']' || char === ')') {
                depth = Math.max(0, depth - 1);
            } else if (char === ',' && depth === 0) {
                items.push(raw.slice(start, i));
                start = i + 1;
            }
        }

        items.push(raw.slice(start));
        return items;
    }

    function normalizeJavaListItem(itemText) {
        const leadingWhitespace = itemText.match(/^\s*/)[0];
        const trailingWhitespace = itemText.match(/\s*$/)[0];
        const value = itemText.slice(leadingWhitespace.length, itemText.length - trailingWhitespace.length);
        if (!value) return itemText;

        const normalizedValue = quoteJavaListValuesOutsideStrings(value);
        if (/^["'{\[]/.test(normalizedValue) || isJsonPrimitive(normalizedValue)) {
            return leadingWhitespace + normalizedValue + trailingWhitespace;
        }

        const escapedValue = normalizedValue.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        return leadingWhitespace + "'" + escapedValue + "'" + trailingWhitespace;
    }

    function findJavaMapValueEnd(raw, start) {
        let depth = 0;
        let inString = false;
        let stringChar = '';
        let escaped = false;

        for (let i = start; i < raw.length; i++) {
            const char = raw[i];

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

            if (char === '{' || char === '[' || char === '(') {
                depth++;
                continue;
            }

            if (char === '}' || char === ']' || char === ')') {
                if (depth === 0) return i;
                depth--;
                continue;
            }

            if (char === ',' && depth === 0 && looksLikeNextJavaField(raw, i + 1)) {
                return i;
            }
        }

        return raw.length;
    }

    function looksLikeNextJavaField(raw, start) {
        return /^\s*[A-Za-z_$][A-Za-z0-9_$]*\s*=/.test(raw.slice(start));
    }

    function shouldQuoteJavaMapValue(valueText) {
        const value = valueText.trim();
        if (!value) return false;
        if (value.startsWith('"') || value.startsWith("'") || value.startsWith('{') || value.startsWith('[')) {
            return false;
        }
        return !isJsonPrimitive(value);
    }

    function quoteJavaMapValue(valueText) {
        const leadingWhitespace = valueText.match(/^\s*/)[0];
        const trailingWhitespace = valueText.match(/\s*$/)[0];
        const value = valueText.slice(leadingWhitespace.length, valueText.length - trailingWhitespace.length);
        const escapedValue = value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        return leadingWhitespace + "'" + escapedValue + "'" + trailingWhitespace;
    }

    function stripJavaClassPrefixes(raw) {
        return raw.replace(/(^|[=:\[,]\s*)[A-Za-z_$][A-Za-z0-9_$]*(?=\s*\{)/g, '$1');
    }

    function replaceEqualsOutsideStrings(raw) {
        let result = '';
        let inString = false;
        let stringChar = '';
        let escaped = false;

        for (let i = 0; i < raw.length; i++) {
            const char = raw[i];

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

            result += char === '=' ? ':' : char;
        }

        return result;
    }

    function removeDanglingSingleQuotesOutsideStrings(raw) {
        let result = '';
        let inString = false;
        let stringChar = '';
        let escaped = false;

        for (let i = 0; i < raw.length; i++) {
            const char = raw[i];

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

            if (char === "'") {
                if (isDanglingSingleQuote(raw, i)) {
                    continue;
                }
                inString = true;
                stringChar = char;
                result += char;
                continue;
            }

            if (char === '"') {
                inString = true;
                stringChar = char;
                result += char;
                continue;
            }

            result += char;
        }

        return result;
    }

    function isDanglingSingleQuote(raw, index) {
        const prevIndex = findPreviousNonWhitespace(raw, index - 1);
        const nextIndex = findNextNonWhitespace(raw, index + 1);

        if (prevIndex === -1) return false;
        if (nextIndex !== -1 && !/[,}\]]/.test(raw[nextIndex])) return false;

        return /[\w.\]\)]/.test(raw[prevIndex]);
    }

    function findPreviousNonWhitespace(raw, index) {
        for (let i = index; i >= 0; i--) {
            if (!/\s/.test(raw[i])) return i;
        }
        return -1;
    }

    function findNextNonWhitespace(raw, index) {
        for (let i = index; i < raw.length; i++) {
            if (!/\s/.test(raw[i])) return i;
        }
        return -1;
    }

    function isJsonPrimitive(value) {
        if (value === 'true' || value === 'false' || value === 'null') {
            return true;
        }
        return /^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(value);
    }

    const api = {
        normalizeJavaStyleObject,
        normalizeJavaObjectParentheses,
        looksLikeJavaStyleObject,
        looksLikeJavaClassObject,
        hasUnquotedEquals,
        quoteJavaListValuesOutsideStrings,
        quoteJavaMapValuesOutsideStrings,
        replaceEqualsOutsideStrings,
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }

    global.JsonJavaStyleNormalizer = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
