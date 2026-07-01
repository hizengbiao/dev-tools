(function (root, factory) {
    const api = factory();

    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }

    root.JsonPathQuery = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    function throwInvalid(path) {
        throw new Error('无效的 JSON Path：' + path);
    }

    function parseJsonPath(path) {
        if (typeof path !== 'string' || !path.trim()) {
            throwInvalid(path);
        }

        const source = path.trim();
        const tokens = [];
        let i = source[0] === '$' ? 1 : 0;

        while (i < source.length) {
            const char = source[i];

            if (char === '.') {
                i++;
                const start = i;
                while (i < source.length && /[A-Za-z0-9_$-]/.test(source[i])) {
                    i++;
                }
                if (start === i) {
                    throwInvalid(path);
                }
                tokens.push(source.slice(start, i));
                continue;
            }

            if (char === '[') {
                const close = source.indexOf(']', i + 1);
                if (close < 0) {
                    throwInvalid(path);
                }

                const content = source.slice(i + 1, close).trim();
                if (/^\d+$/.test(content)) {
                    tokens.push(Number(content));
                } else if (
                    (content.startsWith('"') && content.endsWith('"')) ||
                    (content.startsWith("'") && content.endsWith("'"))
                ) {
                    const key = content.slice(1, -1);
                    if (!key) {
                        throwInvalid(path);
                    }
                    tokens.push(key);
                } else {
                    throwInvalid(path);
                }

                i = close + 1;
                continue;
            }

            if (i === 0) {
                const start = i;
                while (i < source.length && /[A-Za-z0-9_$-]/.test(source[i])) {
                    i++;
                }
                if (start !== i) {
                    tokens.push(source.slice(start, i));
                    continue;
                }
            }

            throwInvalid(path);
        }

        return tokens;
    }

    function formatJsonPath(tokens) {
        return '$' + tokens.map((token) => {
            if (typeof token === 'number') {
                return '[' + token + ']';
            }
            if (/^[A-Za-z_$][A-Za-z0-9_$-]*$/.test(token)) {
                return '.' + token;
            }
            return '[' + JSON.stringify(token) + ']';
        }).join('');
    }

    function queryJsonPath(root, path) {
        const tokens = parseJsonPath(path);
        let current = root;
        const visited = [];

        for (const token of tokens) {
            visited.push(token);
            if (current == null || !(token in Object(current))) {
                return {
                    found: false,
                    path: visited,
                    value: undefined,
                    message: '路径不存在：' + formatJsonPath(visited),
                };
            }
            current = current[token];
        }

        return {
            found: true,
            path: tokens,
            value: current,
        };
    }

    return {
        parseJsonPath,
        formatJsonPath,
        queryJsonPath,
    };
});
