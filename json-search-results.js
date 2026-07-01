(function (root, factory) {
    const api = factory();

    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }

    root.JsonSearchResults = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    function isObject(value) {
        return value !== null && typeof value === 'object';
    }

    function formatKey(key, prefix) {
        const segment = /^[A-Za-z_$][A-Za-z0-9_$-]*$/.test(key)
            ? key
            : '[' + JSON.stringify(key) + ']';

        if (!prefix) {
            return segment;
        }

        return segment.startsWith('[') ? prefix + segment : prefix + '.' + segment;
    }

    function formatArrayPath(prefix, index) {
        return prefix ? `${prefix}[${index}]` : `[${index}]`;
    }

    function normalize(value, caseSensitive) {
        const text = String(value);
        return caseSensitive ? text : text.toLowerCase();
    }

    function matches(value, query, caseSensitive) {
        return normalize(value, caseSensitive).includes(normalize(query, caseSensitive));
    }

    function createLineMap(root) {
        const map = new Map();

        function remember(path, line) {
            if (path && !map.has(path)) {
                map.set(path, line);
            }
        }

        function walk(value, path, lineState) {
            if (Array.isArray(value)) {
                lineState.value++;
                value.forEach((item, index) => walk(item, formatArrayPath(path, index), lineState));
                lineState.value++;
                return;
            }

            if (isObject(value)) {
                lineState.value++;
                Object.keys(value).forEach((key) => {
                    const childPath = formatKey(key, path);
                    remember(childPath, lineState.value);
                    walk(value[key], childPath, lineState);
                });
                lineState.value++;
                return;
            }

            lineState.value++;
        }

        walk(root, '', { value: 1 });
        return map;
    }

    function previewValue(value) {
        if (typeof value === 'string') {
            return value;
        }

        if (isObject(value)) {
            const compact = JSON.stringify(value);
            return compact.length > 120 ? compact.slice(0, 117) + '...' : compact;
        }

        return String(value);
    }

    function searchJsonTree(root, query, options = {}) {
        if (!query || !isObject(root)) {
            return [];
        }

        const caseSensitive = options.caseSensitive === true;
        const lineMap = createLineMap(root);
        const results = [];

        function add(type, path, value) {
            results.push({
                type,
                path,
                line: lineMap.get(path) || null,
                preview: previewValue(value),
            });
        }

        function walk(value, path, key) {
            if (key !== null && matches(key, query, caseSensitive)) {
                add('key', path, value);
            }

            if (!isObject(value) && matches(value, query, caseSensitive)) {
                add('value', path, value);
            }

            if (Array.isArray(value)) {
                value.forEach((item, index) => walk(item, formatArrayPath(path, index), String(index)));
                return;
            }

            if (isObject(value)) {
                Object.keys(value).forEach((childKey) => {
                    walk(value[childKey], formatKey(childKey, path), childKey);
                });
            }
        }

        walk(root, '', null);
        return results;
    }

    return {
        searchJsonTree,
    };
});
