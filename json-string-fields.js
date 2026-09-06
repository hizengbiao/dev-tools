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
        let current = root;
        for (let i = 0; i < path.length - 1; i++) {
            current = current[path[i]];
        }
        Object.defineProperty(current, path[path.length - 1], {
            value, enumerable: true, configurable: true, writable: true,
        });
        return root;
    }

    function getAtPath(root, path) {
        let current = root;
        for (const key of path) {
            if (current == null) {
                return undefined;
            }
            current = current[key];
        }
        return current;
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
        const value = clone(root);

        paths.forEach((path) => {
            let current = value;
            for (let i = 0; i < path.length - 1; i++) {
                current = current[path[i]];
                if (current == null) {
                    return;
                }
            }

            const key = path[path.length - 1];
            if (isObject(current && current[key])) {
                current[key] = JSON.stringify(current[key]);
            }
        });

        return value;
    }

    function restoreStringifiedJsonFieldAtPath(root, path) {
        const valueAtPath = getAtPath(root, path);
        if (!isObject(valueAtPath)) {
            return {
                value: root,
                restoredPath: null,
            };
        }

        const value = setAtPath(clone(root), path, JSON.stringify(valueAtPath));

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
