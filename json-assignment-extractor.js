(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.JsonAssignmentExtractor = factory();
    }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    function findNextNonWhitespace(raw, index) {
        for (let i = index; i < raw.length; i++) {
            if (!/\s/.test(raw[i])) {
                return i;
            }
        }

        return -1;
    }

    function looksLikeBracketPrefixedAssignmentLog(raw) {
        return /^(?:\[[^\]\r\n]+\])+\s*[A-Za-z_$][\w$.-]*\s*=\s*[\[{]/.test(raw);
    }

    function findJsonAssignmentValueStart(raw) {
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

            if (char !== '=') {
                continue;
            }

            const valueStart = findNextNonWhitespace(raw, i + 1);
            if (valueStart !== -1 && /[\[{]/.test(raw[valueStart])) {
                return valueStart;
            }
        }

        return -1;
    }

    function findBalancedJsonValueEnd(raw, start) {
        const stack = [];
        let inString = false;
        let escaped = false;

        for (let i = start; i < raw.length; i++) {
            const char = raw[i];

            if (inString) {
                if (escaped) {
                    escaped = false;
                } else if (char === '\\') {
                    escaped = true;
                } else if (char === '"') {
                    inString = false;
                }
                continue;
            }

            if (char === '"') {
                inString = true;
                continue;
            }

            if (char === '{' || char === '[') {
                stack.push(char);
                continue;
            }

            if (char !== '}' && char !== ']') {
                continue;
            }

            const opening = stack.pop();
            if ((char === '}' && opening !== '{') || (char === ']' && opening !== '[')) {
                return -1;
            }

            if (stack.length === 0) {
                return i;
            }
        }

        return -1;
    }

    function extractJsonValueFromAssignmentLog(raw) {
        const trimmed = String(raw || '').trim();
        if (!trimmed || /^[{\[]/.test(trimmed) && !looksLikeBracketPrefixedAssignmentLog(trimmed)) {
            return raw;
        }

        const assignmentStart = findJsonAssignmentValueStart(trimmed);
        if (assignmentStart === -1) {
            return raw;
        }

        const jsonEnd = findBalancedJsonValueEnd(trimmed, assignmentStart);
        if (jsonEnd === -1) {
            return raw;
        }

        return trimmed.slice(assignmentStart, jsonEnd + 1);
    }

    return {
        extractJsonValueFromAssignmentLog,
        findBalancedJsonValueEnd,
        findJsonAssignmentValueStart,
        looksLikeBracketPrefixedAssignmentLog
    };
});
