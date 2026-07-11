(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }
    root.ToolConfigManager = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    const CONFIG_REGISTRY = [
        {
            id: 'textEscape.variableMappings',
            name: '文本转义变量映射',
            tool: '文本转义转换工具',
            storageKey: 'textEscapeFormatter.variableMappings',
            type: 'json',
            description: '合并拼接字符串时使用的双向变量映射配置。',
        },
    ];

    function getStorage(storage) {
        if (storage) return storage;
        if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
        throw new Error('localStorage is not available');
    }

    function parseStoredValue(raw, entry) {
        if (raw === null || raw === undefined || raw === '') {
            return null;
        }
        if (entry.type === 'json') {
            try {
                return JSON.parse(raw);
            } catch (error) {
                return raw;
            }
        }
        return raw;
    }

    function serializeValue(value, entry) {
        if (entry.type === 'json') {
            return JSON.stringify(value);
        }
        return String(value);
    }

    function findEntry(config) {
        return CONFIG_REGISTRY.find((entry) => entry.id === config.id || entry.storageKey === config.storageKey);
    }

    function createExportPayload(storage, options = {}) {
        const activeStorage = getStorage(storage);
        const configs = CONFIG_REGISTRY
            .map((entry) => {
                const raw = activeStorage.getItem(entry.storageKey);
                if (raw === null) return null;
                return {
                    id: entry.id,
                    name: entry.name,
                    storageKey: entry.storageKey,
                    value: parseStoredValue(raw, entry),
                };
            })
            .filter(Boolean);

        return {
            version: 1,
            exportedAt: options.exportedAt || new Date().toISOString(),
            configs,
        };
    }

    function importConfigPayload(payload, storage) {
        if (!payload || !Array.isArray(payload.configs)) {
            throw new TypeError('configs must be an array');
        }
        const activeStorage = getStorage(storage);
        let imported = 0;
        let skipped = 0;

        payload.configs.forEach((config) => {
            const entry = findEntry(config);
            if (!entry) {
                skipped += 1;
                return;
            }
            activeStorage.setItem(entry.storageKey, serializeValue(config.value, entry));
            imported += 1;
        });

        return { imported, skipped };
    }

    function getRegistry() {
        return CONFIG_REGISTRY.map((entry) => ({ ...entry }));
    }

    return {
        CONFIG_REGISTRY,
        getRegistry,
        createExportPayload,
        importConfigPayload,
    };
});
