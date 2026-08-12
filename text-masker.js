(function (root, factory) {
    const api = factory();

    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }

    root.TextMasker = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    const STORAGE_KEY = 'dev-tools.text-splitter.masking.v1';
    const CONFIG_VERSION = 2;
    const MAX_MAPPINGS = 100;
    const MAX_PATTERN_LENGTH = 2000;
    const MAX_REPLACEMENT_LENGTH = 2000;
    const REGEX_FLAG_ORDER = 'imsu';
    const EMPTY_MATCH_PROBES = ['', 'a', '0', ' ', '\n', 'IP', '测试'];
    const DEFAULT_CONFIG = Object.freeze({
        version: CONFIG_VERSION,
        enabled: true,
        mappings: [],
    });

    function createMappingError(code, message, mappingIndex, field) {
        const error = new Error(message);
        error.code = code;
        error.mappingIndex = mappingIndex;
        error.field = field;
        return error;
    }

    function normalizeRegexFlags(flags, mappingIndex) {
        const rawFlags = String(flags ?? '').trim();
        const seen = new Set();

        for (const flag of rawFlags) {
            if (seen.has(flag)) {
                throw createMappingError(
                    'DUPLICATE_REGEX_FLAG',
                    `Mapping ${mappingIndex + 1} has a duplicate regular expression flag: ${flag}`,
                    mappingIndex,
                    'flags'
                );
            }
            if (!`${REGEX_FLAG_ORDER}g`.includes(flag)) {
                throw createMappingError(
                    'INVALID_REGEX_FLAGS',
                    `Mapping ${mappingIndex + 1} has unsupported regular expression flags`,
                    mappingIndex,
                    'flags'
                );
            }
            seen.add(flag);
        }

        return Array.from(REGEX_FLAG_ORDER).filter((flag) => seen.has(flag)).join('');
    }

    function compileRegex(pattern, flags, mappingIndex) {
        try {
            return new RegExp(pattern, flags);
        } catch (error) {
            throw createMappingError(
                'INVALID_REGEX',
                `Mapping ${mappingIndex + 1} contains an invalid regular expression: ${error.message}`,
                mappingIndex,
                'plain'
            );
        }
    }

    function assertRegexConsumesText(pattern, flags, mappingIndex) {
        const regex = compileRegex(pattern, flags, mappingIndex);
        const probes = [...EMPTY_MATCH_PROBES, pattern];

        if (getMinimumConsumedLength(pattern) === 0) {
            throw createMappingError(
                'EMPTY_REGEX_MATCH',
                `Mapping ${mappingIndex + 1} regular expression can match without consuming text`,
                mappingIndex,
                'plain'
            );
        }

        for (const probe of probes) {
            const match = regex.exec(probe);
            if (match && match[0].length === 0) {
                throw createMappingError(
                    'EMPTY_REGEX_MATCH',
                    `Mapping ${mappingIndex + 1} regular expression can match empty text`,
                    mappingIndex,
                    'plain'
                );
            }
        }
    }

    function getMinimumConsumedLength(pattern) {
        let index = 0;

        function skipCharacterClass() {
            index += 1;
            let escaped = false;
            while (index < pattern.length) {
                const char = pattern[index];
                index += 1;
                if (escaped) {
                    escaped = false;
                } else if (char === '\\') {
                    escaped = true;
                } else if (char === ']') {
                    break;
                }
            }
        }

        function skipEscape() {
            index += 1;
            if (index >= pattern.length) {
                return 0;
            }
            const escaped = pattern[index];
            index += 1;
            if (escaped === 'b' || escaped === 'B' || /[1-9]/.test(escaped)) {
                return 0;
            }
            if (escaped === 'k' && pattern[index] === '<') {
                const end = pattern.indexOf('>', index + 1);
                index = end === -1 ? pattern.length : end + 1;
                return 0;
            }
            if ((escaped === 'p' || escaped === 'P') && pattern[index] === '{') {
                const end = pattern.indexOf('}', index + 1);
                index = end === -1 ? pattern.length : end + 1;
            }
            return 1;
        }

        function parseAtom() {
            const char = pattern[index];
            if (char === '\\') {
                return skipEscape();
            }
            if (char === '[') {
                skipCharacterClass();
                return 1;
            }
            if (char === '^' || char === '$') {
                index += 1;
                return 0;
            }
            if (char !== '(') {
                index += 1;
                return 1;
            }

            index += 1;
            let zeroWidthGroup = false;
            if (pattern[index] === '?') {
                const marker = pattern[index + 1];
                if (marker === ':' || marker === '=' || marker === '!') {
                    zeroWidthGroup = marker !== ':';
                    index += 2;
                } else if (marker === '<') {
                    const lookbehindMarker = pattern[index + 2];
                    if (lookbehindMarker === '=' || lookbehindMarker === '!') {
                        zeroWidthGroup = true;
                        index += 3;
                    } else {
                        const nameEnd = pattern.indexOf('>', index + 2);
                        index = nameEnd === -1 ? pattern.length : nameEnd + 1;
                    }
                } else {
                    const flagsGroup = pattern.slice(index).match(/^\?[imsu-]+:/);
                    if (flagsGroup) {
                        index += flagsGroup[0].length;
                    }
                }
            }

            const groupMinimum = parseAlternatives(')');
            if (pattern[index] === ')') {
                index += 1;
            }
            return zeroWidthGroup ? 0 : groupMinimum;
        }

        function applyQuantifier(atomMinimum) {
            const remainder = pattern.slice(index);
            const counted = remainder.match(/^\{(\d+)(?:,(\d*)?)?\}/);
            if (counted) {
                index += counted[0].length;
                atomMinimum *= Number(counted[1]);
            } else if (pattern[index] === '*' || pattern[index] === '?') {
                index += 1;
                atomMinimum = 0;
            } else if (pattern[index] === '+') {
                index += 1;
            }
            if (pattern[index] === '?') {
                index += 1;
            }
            return atomMinimum;
        }

        function parseAlternatives(stopCharacter) {
            const alternatives = [];
            let sequenceMinimum = 0;
            while (index < pattern.length && pattern[index] !== stopCharacter) {
                if (pattern[index] === '|') {
                    alternatives.push(sequenceMinimum);
                    sequenceMinimum = 0;
                    index += 1;
                    continue;
                }
                sequenceMinimum += applyQuantifier(parseAtom());
            }
            alternatives.push(sequenceMinimum);
            return Math.min(...alternatives);
        }

        return parseAlternatives('');
    }

    function validateMappings(mappings) {
        if (!Array.isArray(mappings)) {
            throw new TypeError('Mappings must be an array');
        }
        if (mappings.length > MAX_MAPPINGS) {
            throw createMappingError(
                'TOO_MANY_MAPPINGS',
                `Mappings cannot contain more than ${MAX_MAPPINGS} items`,
                MAX_MAPPINGS,
                'type'
            );
        }

        const normalized = [];
        const literalPlainValues = new Set();
        const regexValues = new Set();
        const maskedOwners = new Map();

        mappings.forEach((mapping, index) => {
            const rawType = mapping?.type === undefined ? 'literal' : String(mapping.type).toLowerCase();
            const type = rawType === 'text' ? 'literal' : rawType;
            const plain = String(mapping?.plain ?? '');
            const masked = String(mapping?.masked ?? '');
            const isPlainEmpty = plain.trim() === '';
            const isMaskedEmpty = masked.trim() === '';

            if (isPlainEmpty && isMaskedEmpty) {
                return;
            }
            if (type !== 'literal' && type !== 'regex') {
                throw createMappingError(
                    'INVALID_MAPPING_TYPE',
                    `Mapping ${index + 1} has an unsupported type`,
                    index,
                    'type'
                );
            }
            if (isPlainEmpty || isMaskedEmpty) {
                throw createMappingError(
                    'INCOMPLETE_MAPPING',
                    `Mapping ${index + 1} must fill both sides`,
                    index,
                    isPlainEmpty ? 'plain' : 'masked'
                );
            }
            if (plain.length > MAX_PATTERN_LENGTH) {
                throw createMappingError(
                    'PATTERN_TOO_LONG',
                    `Mapping ${index + 1} match content is too long`,
                    index,
                    'plain'
                );
            }
            if (masked.length > MAX_REPLACEMENT_LENGTH) {
                throw createMappingError(
                    'REPLACEMENT_TOO_LONG',
                    `Mapping ${index + 1} replacement is too long`,
                    index,
                    'masked'
                );
            }

            let flags = '';
            if (type === 'literal') {
                if (literalPlainValues.has(plain)) {
                    throw createMappingError(
                        'DUPLICATE_PLAIN',
                        `Mapping ${index + 1} has a duplicate plain value`,
                        index,
                        'plain'
                    );
                }
                literalPlainValues.add(plain);
            } else {
                flags = normalizeRegexFlags(mapping?.flags, index);
                compileRegex(plain, flags, index);
                assertRegexConsumesText(plain, flags, index);
                const regexKey = `${plain}\u0000${flags}`;
                if (regexValues.has(regexKey)) {
                    throw createMappingError(
                        'DUPLICATE_REGEX',
                        `Mapping ${index + 1} has a duplicate regular expression`,
                        index,
                        'plain'
                    );
                }
                regexValues.add(regexKey);
            }

            const maskedOwner = maskedOwners.get(masked);
            if (type === 'literal' && maskedOwner) {
                throw createMappingError(
                    'DUPLICATE_MASKED',
                    `Mapping ${index + 1} has a duplicate masked value`,
                    index,
                    'masked'
                );
            }
            if (type === 'regex' && maskedOwner?.type === 'literal') {
                throw createMappingError(
                    'DUPLICATE_MASKED',
                    `Mapping ${index + 1} conflicts with a reversible masked value`,
                    index,
                    'masked'
                );
            }
            if (!maskedOwner || type === 'literal') {
                maskedOwners.set(masked, { type, index });
            }

            normalized.push({ type, plain, masked, flags });
        });

        return normalized;
    }

    function expandRegexReplacement(replacement, match) {
        return replacement.replace(/\$(\$|&|<[^>]+>|\d{1,2})/g, (token, reference) => {
            if (reference === '$') {
                return '$';
            }
            if (reference === '&') {
                return match[0];
            }
            if (reference.startsWith('<')) {
                const name = reference.slice(1, -1);
                if (!match.groups || !Object.prototype.hasOwnProperty.call(match.groups, name)) {
                    return token;
                }
                return match.groups[name] ?? '';
            }

            const captureIndex = Number(reference);
            if (captureIndex > 0 && captureIndex < match.length) {
                return match[captureIndex] ?? '';
            }
            if (reference.length === 2) {
                const firstCaptureIndex = Number(reference[0]);
                if (firstCaptureIndex > 0 && firstCaptureIndex < match.length) {
                    return `${match[firstCaptureIndex] ?? ''}${reference[1]}`;
                }
            }
            return token;
        });
    }

    function compileMappings(mappings, direction) {
        return mappings
            .map((mapping, order) => ({ mapping, order }))
            .filter(({ mapping }) => direction !== 'unmask' || mapping.type === 'literal')
            .map(({ mapping, order }) => {
                if (mapping.type === 'regex') {
                    return {
                        type: 'regex',
                        order,
                        regex: compileRegex(mapping.plain, `${mapping.flags}g`, order),
                        replacement: mapping.masked,
                    };
                }
                return {
                    type: 'literal',
                    order,
                    source: direction === 'unmask' ? mapping.masked : mapping.plain,
                    replacement: direction === 'unmask' ? mapping.plain : mapping.masked,
                };
            });
    }

    function findNextCandidate(source, cursor, rules) {
        let selected = null;

        rules.forEach((rule) => {
            let candidate = null;
            if (rule.type === 'literal') {
                const start = source.indexOf(rule.source, cursor);
                if (start !== -1) {
                    candidate = {
                        start,
                        end: start + rule.source.length,
                        replacement: rule.replacement,
                        order: rule.order,
                    };
                }
            } else {
                rule.regex.lastIndex = cursor;
                const match = rule.regex.exec(source);
                if (match) {
                    if (match[0].length === 0) {
                        throw createMappingError(
                            'EMPTY_REGEX_MATCH',
                            `Mapping ${rule.order + 1} regular expression matched empty text`,
                            rule.order,
                            'plain'
                        );
                    }
                    candidate = {
                        start: match.index,
                        end: match.index + match[0].length,
                        replacement: expandRegexReplacement(rule.replacement, match),
                        order: rule.order,
                    };
                }
            }

            if (!candidate) {
                return;
            }
            if (!selected
                || candidate.start < selected.start
                || (candidate.start === selected.start && candidate.end > selected.end)
                || (candidate.start === selected.start && candidate.end === selected.end && candidate.order < selected.order)) {
                selected = candidate;
            }
        });

        return selected;
    }

    function applyMappings(text, mappings, direction) {
        const source = String(text ?? '');
        const normalized = validateMappings(mappings);
        const rules = compileMappings(normalized, direction);

        if (!source || !rules.length) {
            return source;
        }

        let output = '';
        let cursor = 0;
        while (cursor < source.length) {
            const match = findNextCandidate(source, cursor, rules);
            if (!match) {
                output += source.slice(cursor);
                break;
            }
            output += source.slice(cursor, match.start);
            output += match.replacement;
            cursor = match.end;
        }
        return output;
    }

    function maskText(text, mappings) {
        return applyMappings(text, mappings, 'mask');
    }

    function unmaskText(text, mappings) {
        return applyMappings(text, mappings, 'unmask');
    }

    function normalizeConfig(config) {
        const value = config && typeof config === 'object' ? config : {};
        return {
            version: CONFIG_VERSION,
            enabled: value.enabled === undefined ? true : Boolean(value.enabled),
            mappings: validateMappings(value.mappings ?? []),
        };
    }

    function parseConfig(json) {
        let value;
        try {
            value = JSON.parse(String(json));
        } catch (error) {
            throw new Error('Invalid JSON configuration');
        }
        return normalizeConfig(value);
    }

    function stringifyConfig(config) {
        return JSON.stringify(normalizeConfig(config), null, 2);
    }

    return {
        STORAGE_KEY,
        CONFIG_VERSION,
        DEFAULT_CONFIG,
        validateMappings,
        applyMappings,
        maskText,
        unmaskText,
        normalizeConfig,
        normalizeRegexFlags,
        parseConfig,
        stringifyConfig,
    };
});
