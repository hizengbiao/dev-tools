(function (root, factory) {
    const api = factory();

    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }

    root.JsonKeyPaths = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    function isPlainObject(value) {
        return value !== null && typeof value === 'object' && !Array.isArray(value);
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

    function addPath(paths, seen, path) {
        if (!seen.has(path)) {
            seen.add(path);
            paths.push(path);
        }
    }

    function walk(value, prefix, paths, seen) {
        if (Array.isArray(value)) {
            if (!prefix) {
                value.forEach((item) => walk(item, '[]', paths, seen));
                return;
            }

            if (value.some((item) => !isPlainObject(item) && !Array.isArray(item))) {
                addPath(paths, seen, prefix + '[]');
            }

            value.forEach((item) => walk(item, prefix + '[]', paths, seen));
            return;
        }

        if (!isPlainObject(value)) {
            return;
        }

        Object.keys(value).forEach((key) => {
            const childPath = formatKey(key, prefix);
            addPath(paths, seen, childPath);
            walk(value[key], childPath, paths, seen);
        });
    }

    function extractJsonKeyPaths(root) {
        const paths = [];
        const seen = new Set();
        walk(root, '', paths, seen);
        return paths;
    }

    return {
        extractJsonKeyPaths,
    };
});
