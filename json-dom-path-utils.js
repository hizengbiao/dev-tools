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

    function getRelativeNodeDepthFromDom(container, node) {
        let depth = 0;
        let cur = node;
        while (cur && cur !== container) {
            const parentNode = cur.parentElement ? cur.parentElement.closest('.json-node') : null;
            if (!parentNode) {
                return -1;
            }
            depth++;
            cur = parentNode;
        }

        return cur === container ? depth : -1;
    }

    function getOwnCollapsibleIcon(node) {
        const row = node && node.children ? node.children[0] : null;
        if (row && row.classList && row.classList.contains('json-row')) {
            return row.querySelector('.collapsible-icon');
        }

        return node ? node.querySelector('.collapsible-icon') : null;
    }

    return {
        parseNodePath,
        isPathPrefix,
        getRelativeNodeDepthFromDom,
        getOwnCollapsibleIcon,
    };
});
