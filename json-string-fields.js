(function (root, factory) {
    const api = factory();

    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }

    root.JsonStringFields = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    function isObject(value) {
        return value !== null && typeof value === 'object';
    }

    function formatKey(key, prefix) {
        if (typeof key === 'number') {
            return `${prefix || ''}[${key}]`;
        }

        const segment = /^[A-Za-z_$][A-Za-z0-9_$-]*$/.test(key)
            ? key
            : '[' + JSON.stringify(key) + ']';

        if (!prefix) {
            return segment;
        }

        return segment.startsWith('[') ? prefix + segment : prefix + '.' + segment;
    }

    function parseStringifiedJson(value) {
        if (typeof value !== 'string' || !value.trim()) {
            return null;
        }

        const trimmed = value.trim();
        if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
            return null;
        }

        try {
            const parsed = JSON.parse(trimmed);
            if (parsed !== null && typeof parsed === 'object') {
                return parsed;
            }
        } catch (e) {
            return null;
        }

        return null;
    }

    function clone(value) {
        if (!isObject(value)) {
            return value;
        }

        return Array.isArray(value)
            ? value.map((item) => clone(item))
            : Object.fromEntries(Object.keys(value).map((key) => [key, clone(value[key])]));
    }

    function setAtPath(root, path, value) {
        if (!path.length) return value;
        const current = getAtPath(root, path.slice(0, -1));
        if (!isObject(current) || !Object.prototype.hasOwnProperty.call(current, path[path.length - 1])) return root;
        Object.defineProperty(current, path[path.length - 1], {
            value, enumerable: true, configurable: true, writable: true,
        });
        return root;
    }

    function getAtPath(root, path) {
        if (!isValidPath(path)) return undefined;
        let current = root;
        for (const key of path) {
            if (!isObject(current) || !Object.prototype.hasOwnProperty.call(current, key)) {
                return undefined;
            }
            current = current[key];
        }
        return current;
    }

    function isValidPath(path) {
        return Array.isArray(path) && path.every((key) =>
            typeof key === 'string' || (Number.isInteger(key) && key >= 0));
    }

    function restorePaths(root, paths) {
        let value = clone(root);
        const seen = new Set();
        const orderedPaths = (Array.isArray(paths) ? paths : [])
            .filter((path) => {
                if (!isValidPath(path)) return false;
                const key = JSON.stringify(path.map(String));
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            })
            .sort((left, right) => right.length - left.length);

        // Restore descendants first so serializing their parent preserves the
        // original string boundaries, including any edits made while expanded.
        orderedPaths.forEach((path) => {
            const current = getAtPath(value, path);
            if (isObject(current)) value = setAtPath(value, path, JSON.stringify(current));
        });
        return value;
    }

    function walk(value, path, pathText, visitor) {
        if (!isObject(value)) {
            return;
        }

        if (Array.isArray(value)) {
            value.forEach((item, index) => {
                walk(item, [...path, index], formatKey(index, pathText), visitor);
            });
            return;
        }

        Object.keys(value).forEach((key) => {
            const childPath = [...path, key];
            const childPathText = formatKey(key, pathText);
            visitor(value[key], childPath, childPathText);
            walk(value[key], childPath, childPathText, visitor);
        });
    }

    function collectStringifiedJsonFields(root) {
        const fields = [];

        walk(root, [], '', (value, path, pathText) => {
            const parsed = parseStringifiedJson(value);
            if (!parsed) {
                return;
            }

            fields.push({
                path,
                pathText,
                type: Array.isArray(parsed) ? 'array' : 'object',
                value,
                parsed,
            });
        });

        return fields;
    }

    function expandStringifiedJsonFields(root) {
        const value = clone(root);
        const fields = collectStringifiedJsonFields(value);

        fields.forEach((field) => {
            setAtPath(value, field.path, clone(field.parsed));
        });

        return {
            value,
            expandedPaths: fields.map((field) => field.path),
        };
    }

    function expandStringifiedJsonFieldAtPath(root, path) {
        const parsed = parseStringifiedJson(getAtPath(root, path));
        if (!parsed) {
            return {
                value: root,
                expandedPath: null,
            };
        }

        const value = setAtPath(clone(root), path, clone(parsed));

        return {
            value,
            expandedPath: path,
        };
    }

    function restoreStringifiedJsonFields(root, paths) {
        return restorePaths(root, paths);
    }

    function restoreStringifiedJsonFieldAtPath(root, path, expandedPaths = []) {
        const valueAtPath = getAtPath(root, path);
        if (!isObject(valueAtPath)) {
            return {
                value: root,
                restoredPath: null,
            };
        }

        const descendants = (Array.isArray(expandedPaths) ? expandedPaths : []).filter((candidate) =>
            isValidPath(candidate) && candidate.length > path.length &&
            path.every((key, index) => String(key) === String(candidate[index])));
        const value = restorePaths(root, [...descendants, path]);

        return {
            value,
            restoredPath: path,
        };
    }

    return {
        collectStringifiedJsonFields,
        expandStringifiedJsonFields,
        restoreStringifiedJsonFields,
        expandStringifiedJsonFieldAtPath,
        restoreStringifiedJsonFieldAtPath,
    };
});
