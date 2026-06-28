(function (root, factory) {
    const api = factory();

    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }

    root.JsonPathEditor = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    function getValueAtPath(root, path) {
        return path.reduce((target, key) => target[key], root);
    }

    function setValueAtPath(root, path, value) {
        if (!path.length) {
            return value;
        }

        const parent = getValueAtPath(root, path.slice(0, -1));
        parent[path[path.length - 1]] = value;
        return root;
    }

    function renameKeyAtPath(root, parentPath, oldKey, newKey) {
        const parent = parentPath.length ? getValueAtPath(root, parentPath) : root;

        if (Array.isArray(parent)) {
            return root;
        }

        const keys = Object.keys(parent);
        const renamed = {};
        keys.forEach((key) => {
            renamed[key === oldKey ? newKey : key] = parent[key];
        });

        if (!parentPath.length) {
            return renamed;
        }

        keys.forEach((key) => delete parent[key]);
        Object.assign(parent, renamed);
        return root;
    }

    return {
        getValueAtPath,
        setValueAtPath,
        renameKeyAtPath,
    };
});
