(function (root, factory) {
    const api = factory();

    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }

    root.JsonPathEditor = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    function getValueAtPath(root, path) {
        return path.reduce((target, key) => {
            if (target === null || typeof target !== 'object' ||
                !Object.prototype.hasOwnProperty.call(target, key)) {
                throw new Error('JSON 路径不存在');
            }
            return target[key];
        }, root);
    }

    function setValueAtPath(root, path, value) {
        if (!path.length) {
            return value;
        }

        const parent = getValueAtPath(root, path.slice(0, -1));
        Object.defineProperty(parent, path[path.length - 1], {
            value, enumerable: true, configurable: true, writable: true,
        });
        return root;
    }

    function renameKeyAtPath(root, parentPath, oldKey, newKey) {
        const parent = parentPath.length ? getValueAtPath(root, parentPath) : root;

        if (Array.isArray(parent)) {
            return root;
        }

        if (!Object.prototype.hasOwnProperty.call(parent, oldKey)) {
            throw new Error('JSON 路径不存在');
        }
        if (oldKey === newKey) return root;
        if (Object.prototype.hasOwnProperty.call(parent, newKey)) {
            throw new Error('键名已存在，请使用其他名称');
        }

        const keys = Object.keys(parent);
        const renamed = Object.fromEntries(keys.map((key) => [key === oldKey ? newKey : key, parent[key]]));

        if (!parentPath.length) {
            return renamed;
        }

        keys.forEach((key) => delete parent[key]);
        Object.defineProperties(parent, Object.getOwnPropertyDescriptors(renamed));
        return root;
    }

    return {
        getValueAtPath,
        setValueAtPath,
        renameKeyAtPath,
    };
});
