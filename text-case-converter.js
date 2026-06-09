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
        swapText
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    } else {
        root.TextCaseConverter = api;
    }
})(typeof window !== 'undefined' ? window : globalThis);
