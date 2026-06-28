(function (root, factory) {
    const api = factory();

    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }

    root.JsonDomPathUtils = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    function parseNodePath(node) {
        if (!node || !node.dataset || !node.dataset.path) {
            return null;
        }

        try {
            const path = JSON.parse(node.dataset.path);
            return Array.isArray(path) ? path : null;
        } catch (e) {
            return null;
        }
    }

    function isPathPrefix(prefix, path) {
        if (prefix.length > path.length) {
            return false;
        }

        for (let i = 0; i < prefix.length; i++) {
            if (prefix[i] !== path[i]) {
                return false;
            }
        }

        return true;
    }

    return {
        parseNodePath,
        isPathPrefix,
    };
});
