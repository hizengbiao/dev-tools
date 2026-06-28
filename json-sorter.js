(function (root, factory) {
    const api = factory();

    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }

    root.JsonSorter = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    function sortObjectKeys(value, asc = true) {
        if (Array.isArray(value)) {
            return value.map((item) => sortObjectKeys(item, asc));
        }

        if (value && typeof value === 'object') {
            const keys = Object.keys(value).sort();
            if (!asc) {
                keys.reverse();
            }

            const sorted = {};
            keys.forEach((key) => {
                sorted[key] = sortObjectKeys(value[key], asc);
            });
            return sorted;
        }

        return value;
    }

    return {
        sortObjectKeys,
    };
});
