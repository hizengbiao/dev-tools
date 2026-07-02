(function (root, factory) {
    const api = factory();

    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }

    root.RegexRiskAnalyzer = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    function isQuantifierAt(source, index) {
        const char = source[index];
        if (char === '*' || char === '+' || char === '?') {
            return { text: char, end: index + 1 };
        }

        if (char !== '{') {
            return null;
        }

        const match = source.slice(index).match(/^\{\d+(?:,\d*)?\}/);
        return match ? { text: match[0], end: index + match[0].length } : null;
    }

    function hasInnerQuantifier(content) {
        let escaped = false;
        let inClass = false;

        for (let index = 0; index < content.length; index += 1) {
            const char = content[index];

            if (escaped) {
                escaped = false;
                continue;
            }

            if (char === '\\') {
                escaped = true;
                continue;
            }

            if (char === '[') {
                inClass = true;
                continue;
            }

            if (char === ']') {
                inClass = false;
                continue;
            }

            if (!inClass && isQuantifierAt(content, index)) {
                return true;
            }
        }

        return false;
    }

    function splitTopLevelAlternatives(content) {
        const parts = [];
        let start = 0;
        let escaped = false;
        let inClass = false;
        let depth = 0;

        for (let index = 0; index < content.length; index += 1) {
            const char = content[index];

            if (escaped) {
                escaped = false;
                continue;
            }

            if (char === '\\') {
                escaped = true;
                continue;
            }

            if (char === '[') {
                inClass = true;
                continue;
            }

            if (char === ']') {
                inClass = false;
                continue;
            }

            if (inClass) {
                continue;
            }

            if (char === '(') {
                depth += 1;
                continue;
            }

            if (char === ')' && depth > 0) {
                depth -= 1;
                continue;
            }

            if (char === '|' && depth === 0) {
                parts.push(content.slice(start, index));
                start = index + 1;
            }
        }

        parts.push(content.slice(start));
        return parts;
    }

    function literalPrefix(part) {
        let prefix = '';
        let escaped = false;

        for (let index = 0; index < part.length; index += 1) {
            const char = part[index];

            if (escaped) {
                prefix += char;
                escaped = false;
                continue;
            }

            if (char === '\\') {
                escaped = true;
                continue;
            }

            if ('()[]{}.^$|?*+'.includes(char)) {
                break;
            }

            prefix += char;
        }

        return prefix;
    }

    function hasOverlappingAlternatives(content) {
        const parts = splitTopLevelAlternatives(content)
            .map((part) => literalPrefix(part))
            .filter(Boolean);

        for (let left = 0; left < parts.length; left += 1) {
            for (let right = left + 1; right < parts.length; right += 1) {
                if (parts[left].startsWith(parts[right]) || parts[right].startsWith(parts[left])) {
                    return true;
                }
            }
        }

        return false;
    }

    function findGroups(source) {
        const groups = [];
        const stack = [];
        let escaped = false;
        let inClass = false;

        for (let index = 0; index < source.length; index += 1) {
            const char = source[index];

            if (escaped) {
                escaped = false;
                continue;
            }

            if (char === '\\') {
                escaped = true;
                continue;
            }

            if (char === '[') {
                inClass = true;
                continue;
            }

            if (char === ']') {
                inClass = false;
                continue;
            }

            if (inClass) {
                continue;
            }

            if (char === '(') {
                stack.push(index);
                continue;
            }

            if (char === ')' && stack.length) {
                const start = stack.pop();
                const quantifier = isQuantifierAt(source, index + 1);
                groups.push({
                    start,
                    end: quantifier ? quantifier.end : index + 1,
                    contentEnd: index,
                    repeated: Boolean(quantifier),
                });
            }
        }

        return groups;
    }

    function analyzeRegexRisks(pattern) {
        const source = String(pattern || '');
        const risks = [];
        const seen = new Set();

        findGroups(source).forEach((group) => {
            if (!group.repeated) {
                return;
            }

            const content = source.slice(group.start + 1, group.contentEnd);
            const fragment = source.slice(group.start, group.end);

            if (hasInnerQuantifier(content)) {
                const key = `nested:${group.start}:${group.end}`;
                if (!seen.has(key)) {
                    seen.add(key);
                    risks.push({
                        type: 'nested-quantifier',
                        fragment,
                        index: group.start,
                        reason: 'Nested quantifier can trigger catastrophic backtracking on near-miss input.',
                    });
                }
            }

            if (hasOverlappingAlternatives(content)) {
                const key = `alt:${group.start}:${group.end}`;
                if (!seen.has(key)) {
                    seen.add(key);
                    risks.push({
                        type: 'overlapping-alternation',
                        fragment,
                        index: group.start,
                        reason: 'Overlapping alternation inside a repeated group can create many backtracking paths.',
                    });
                }
            }
        });

        return risks;
    }

    return {
        analyzeRegexRisks,
    };
});
