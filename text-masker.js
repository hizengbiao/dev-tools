(function (root, factory) {
    const api = factory();

    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }

    root.TextMasker = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    const STORAGE_KEY = 'dev-tools.text-splitter.masking.v1';
    const DEFAULT_CONFIG = Object.freeze({
        version: 1,
        enabled: true,
        mappings: [],
    });

    function validateMappings(mappings) {
        if (!Array.isArray(mappings)) {
            throw new TypeError('Mappings must be an array');
        }

        const normalized = [];
        const plainValues = new Set();
        const maskedValues = new Set();

        mappings.forEach((mapping, index) => {
            const plain = String(mapping?.plain ?? '');
            const masked = String(mapping?.masked ?? '');
            const isPlainEmpty = plain.trim() === '';
            const isMaskedEmpty = masked.trim() === '';

            if (isPlainEmpty && isMaskedEmpty) {
                return;
            }
            if (isPlainEmpty || isMaskedEmpty) {
                throw new Error(`Mapping ${index + 1} must fill both sides`);
            }
            if (plainValues.has(plain)) {
                throw new Error(`Mapping ${index + 1} has a duplicate plain value`);
            }
            if (maskedValues.has(masked)) {
                throw new Error(`Mapping ${index + 1} has a duplicate masked value`);
            }

            plainValues.add(plain);
            maskedValues.add(masked);
            normalized.push({ plain, masked });
        });

        return normalized;
    }

    function applyMappings(text, mappings, direction) {
        const source = String(text ?? '');
        const normalized = validateMappings(mappings);
        const sourceKey = direction === 'unmask' ? 'masked' : 'plain';
        const targetKey = direction === 'unmask' ? 'plain' : 'masked';
        const ordered = normalized
            .map((mapping) => ({ source: mapping[sourceKey], target: mapping[targetKey] }))
            .sort((left, right) => right.source.length - left.source.length);

        if (!source || !ordered.length) {
            return source;
        }

        let output = '';
        let index = 0;
        while (index < source.length) {
            const match = ordered.find((mapping) => source.startsWith(mapping.source, index));
            if (match) {
                output += match.target;
                index += match.source.length;
            } else {
                output += source[index];
                index += 1;
            }
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
            version: 1,
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
        DEFAULT_CONFIG,
        validateMappings,
        applyMappings,
        maskText,
        unmaskText,
        normalizeConfig,
        parseConfig,
        stringifyConfig,
    };
});
