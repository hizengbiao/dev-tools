(function (root, factory) {
    const api = factory();

    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }

    root.RegexRuntimeUtils = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    function getRegexWithFlags(source, flags) {
        const orderedFlags = ['d', 'g', 'i', 'm', 's', 'u', 'v', 'y'];
        const uniqueFlags = new Set(String(flags || '').split(''));
        return new RegExp(source, orderedFlags.filter((flag) => uniqueFlags.has(flag)).join(''));
    }

    function parseInlineFlags(pattern, selectedFlags) {
        const sourcePattern = String(pattern || '');
        const inlineFlagMatch = sourcePattern.match(/^\(\?([gimsu]+)\)/);
        const flags = new Set(String(selectedFlags || '').split(''));

        if (!inlineFlagMatch) {
            return { source: sourcePattern, flags: String(selectedFlags || '') };
        }

        inlineFlagMatch[1].split('').forEach((flag) => flags.add(flag));

        return {
            source: sourcePattern.slice(inlineFlagMatch[0].length),
            flags: ['g', 'i', 'm', 's', 'u'].filter((flag) => flags.has(flag)).join(''),
        };
    }

    function normalizeEscapedRegexPattern(pattern) {
        return String(pattern || '').replace(/\\\\(?=[dDsSwWbBtrnvf0()[\]{}.^$|?*+\\/])/g, '\\');
    }

    function getLineColumn(text, index) {
        const before = String(text || '').slice(0, index);
        const lines = before.split('\n');
        return {
            line: lines.length,
            column: lines[lines.length - 1].length + 1,
        };
    }

    function getCaptureGroupCount(pattern) {
        const sourcePattern = String(pattern || '');
        let count = 0;
        let escaped = false;
        let inClass = false;

        for (let index = 0; index < sourcePattern.length; index += 1) {
            const char = sourcePattern[index];

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

            if (char !== '(' || inClass) {
                continue;
            }

            const next = sourcePattern[index + 1];
            const afterNext = sourcePattern[index + 2];
            const isNonCapturing = next === '?' && afterNext !== '<';

            if (!isNonCapturing) {
                count += 1;
            }
        }

        return count;
    }

    function getMissingReplacementGroups(replacement, pattern) {
        const captureGroupCount = getCaptureGroupCount(pattern);
        const missingGroups = new Set();
        const groupReferenceRegex = /\$(\d{1,2})/g;
        const replacementText = String(replacement || '');
        let match;

        while ((match = groupReferenceRegex.exec(replacementText)) !== null) {
            const previousChar = replacementText[match.index - 1];
            const groupNumber = Number(match[1]);

            if (previousChar === '$' || groupNumber === 0) {
                continue;
            }

            if (groupNumber > captureGroupCount) {
                missingGroups.add(`$${groupNumber}`);
            }
        }

        return Array.from(missingGroups);
    }

    return {
        getRegexWithFlags,
        parseInlineFlags,
        normalizeEscapedRegexPattern,
        getLineColumn,
        getCaptureGroupCount,
        getMissingReplacementGroups,
    };
});
