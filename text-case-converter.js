(function (root) {
    function wordsFromText(value) {
        return String(value || '')
            .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
            .replace(/[_\-.\/]+/g, ' ')
            .replace(/[^\p{L}\p{N}]+/gu, ' ')
            .trim()
            .split(/\s+/)
            .filter(Boolean);
    }

    function capitalize(word) {
        if (!word) return '';
        const lower = word.toLowerCase();
        return lower.charAt(0).toUpperCase() + lower.slice(1);
    }

    function toSnakeCase(value) {
        return wordsFromText(value).map(word => word.toLowerCase()).join('_');
    }

    function toConstantCase(value) {
        return toSnakeCase(value).toUpperCase();
    }

    function toKebabCase(value) {
        return wordsFromText(value).map(word => word.toLowerCase()).join('-');
    }

    function toCamelCase(value) {
        const words = wordsFromText(value);
        return words
            .map((word, index) => index === 0 ? word.toLowerCase() : capitalize(word))
            .join('');
    }

    function toPascalCase(value) {
        return wordsFromText(value).map(capitalize).join('');
    }

    function toTitleCase(value) {
        return wordsFromText(value).map(capitalize).join(' ');
    }

    function toSentenceCase(value) {
        const sentence = wordsFromText(value).map(word => word.toLowerCase()).join(' ');
        return sentence ? sentence.charAt(0).toUpperCase() + sentence.slice(1) : '';
    }

    function toUpperCase(value) {
        return String(value || '').toUpperCase();
    }

    function toLowerCase(value) {
        return String(value || '').toLowerCase();
    }

    function trimLines(value) {
        return String(value || '')
            .split(/\r?\n/)
            .map(line => line.trim().replace(/\s+/g, ' '))
            .join('\n')
            .trim();
    }

    function convertLines(value, converter) {
        return String(value || '')
            .split(/\r?\n/)
            .map(line => line.trim() ? converter(line) : '')
            .join('\n');
    }

    function uniquePush(list, value) {
        if (value && !list.includes(value)) {
            list.push(value);
        }
    }

    function extractJsonKeys(value) {
        const keys = [];
        function walk(node) {
            if (Array.isArray(node)) {
                node.forEach(walk);
                return;
            }
            if (!node || typeof node !== 'object') return;
            Object.keys(node).forEach(key => {
                uniquePush(keys, key);
                walk(node[key]);
            });
        }
        try {
            walk(JSON.parse(value));
        } catch (error) {
            return [];
        }
        return keys;
    }

    function extractSqlSelectFields(value) {
        const text = String(value || '');
        const match = text.match(/\bselect\b([\s\S]+?)\bfrom\b/i);
        if (!match) return [];
        return match[1]
            .split(',')
            .map(part => part.trim())
            .map(part => {
                const alias = part.match(/\bas\s+([A-Za-z_$][\w$]*)\s*$/i);
                if (alias) return part.replace(/\bas\s+[A-Za-z_$][\w$]*\s*$/i, '').trim();
                const trailingAlias = part.match(/(.+?)\s+([A-Za-z_$][\w$]*)$/);
                if (trailingAlias && /[()]/.test(trailingAlias[1])) return trailingAlias[2];
                return part;
            })
            .map(part => part.replace(/^[`"'[]|[`"'\]]$/g, ''))
            .map(part => {
                const dotIndex = part.lastIndexOf('.');
                return dotIndex >= 0 ? part.slice(dotIndex + 1) : part;
            })
            .filter(part => /^[A-Za-z_$][\w$]*$/.test(part));
    }

    function extractJavaFields(value) {
        const fields = [];
        String(value || '').split(/\r?\n/).forEach(line => {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('@') || trimmed.includes('(')) return;
            const match = trimmed.match(/^(?:public|private|protected)?\s*(?:static\s+)?(?:final\s+)?[\w<>\[\].?,\s]+\s+([A-Za-z_$][\w$]*)\s*(?:=[^;]*)?;$/);
            if (match) uniquePush(fields, match[1]);
        });
        return fields;
    }

    function extractFieldNames(value) {
        const text = String(value || '');
        const fields = [];
        extractJsonKeys(text).forEach(field => uniquePush(fields, field));
        extractSqlSelectFields(text).forEach(field => uniquePush(fields, field));
        extractJavaFields(text).forEach(field => uniquePush(fields, field));
        return fields;
    }

    function convertExtractedFields(value, converter) {
        return extractFieldNames(value).map(converter).join('\n');
    }

    function generateCodeNames(value) {
        const camel = toCamelCase(value);
        const pascal = toPascalCase(value);
        const isBooleanStyle = /^is[A-Z]/.test(camel);
        const propertyName = isBooleanStyle ? pascal.slice(2) : pascal;
        return {
            constant: toConstantCase(value),
            enumName: toConstantCase(value),
            getter: isBooleanStyle ? camel : `get${pascal}`,
            setter: `set${propertyName}`
        };
    }

    function generateCodeNamesReport(value) {
        return String(value || '')
            .split(/\r?\n/)
            .filter(line => line.trim())
            .map(line => {
                const names = generateCodeNames(line);
                return [
                    line.trim(),
                    `  常量: ${names.constant}`,
                    `  枚举: ${names.enumName}`,
                    `  Getter: ${names.getter}`,
                    `  Setter: ${names.setter}`
                ].join('\n');
            })
            .join('\n\n');
    }

    function normalizeRuleList(value) {
        if (Array.isArray(value)) {
            return value.map(item => String(item).trim()).filter(Boolean);
        }
        return String(value || '')
            .split(/[,，\s]+/)
            .map(item => item.trim())
            .filter(Boolean);
    }

    function applyAffixRules(value, options = {}) {
        const original = String(value || '').trim();
        let next = original;
        let removedPrefix = '';
        let removedSuffix = '';
        for (const prefix of normalizeRuleList(options.removePrefixes)) {
            if (next.startsWith(prefix) && next.length > prefix.length) {
                next = next.slice(prefix.length);
                removedPrefix = prefix;
                break;
            }
        }
        for (const suffix of normalizeRuleList(options.removeSuffixes)) {
            if (next.endsWith(suffix) && next.length > suffix.length) {
                next = next.slice(0, -suffix.length);
                removedSuffix = suffix;
                break;
            }
        }
        return {
            original,
            value: next,
            removedPrefix,
            removedSuffix
        };
    }

    function convertWithAffixRules(value, converter, options = {}) {
        return String(value || '')
            .split(/\r?\n/)
            .map(line => {
                if (!line.trim()) return '';
                const normalized = applyAffixRules(line, options).value;
                return converter(normalized);
            })
            .join('\n');
    }

    function swapText(input, output) {
        return {
            input: String(output || ''),
            output: String(input || '')
        };
    }

    const api = {
        wordsFromText,
        toSnakeCase,
        toConstantCase,
        toKebabCase,
        toCamelCase,
        toPascalCase,
        toTitleCase,
        toSentenceCase,
        toUpperCase,
        toLowerCase,
        trimLines,
        convertLines,
        extractFieldNames,
        convertExtractedFields,
        generateCodeNames,
        generateCodeNamesReport,
        normalizeRuleList,
        applyAffixRules,
        convertWithAffixRules,
        swapText
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    } else {
        root.TextCaseConverter = api;
    }
})(typeof window !== 'undefined' ? window : globalThis);
