(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }
    root.NginxFormatter = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    function toSource(input) {
        return String(input == null ? '' : input).replace(/\r\n?/g, '\n');
    }

    function tokenizeNginx(input) {
        const source = toSource(input);
        const tokens = [];
        let index = 0;
        let line = 1;
        let column = 1;

        function push(type, start, startLine, startColumn, end) {
            tokens.push({
                type,
                value: source.slice(start, end),
                start,
                end,
                line: startLine,
                column: startColumn,
            });
        }

        function advance() {
            if (source[index] === '\n') {
                line += 1;
                column = 1;
            } else {
                column += 1;
            }
            index += 1;
        }

        while (index < source.length) {
            const start = index;
            const startLine = line;
            const startColumn = column;
            const char = source[index];

            if (char === '\n') {
                advance();
                push('newline', start, startLine, startColumn, index);
                continue;
            }

            if (/\s/.test(char)) {
                while (index < source.length && source[index] !== '\n' && /\s/.test(source[index])) {
                    advance();
                }
                push('text', start, startLine, startColumn, index);
                continue;
            }

            if (char === '#') {
                while (index < source.length && source[index] !== '\n') {
                    advance();
                }
                push('comment', start, startLine, startColumn, index);
                continue;
            }

            if (char === '"' || char === "'") {
                const quote = char;
                advance();
                while (index < source.length) {
                    if (source[index] === '\\' && index + 1 < source.length) {
                        advance();
                        advance();
                        continue;
                    }
                    const current = source[index];
                    advance();
                    if (current === quote) break;
                }
                push('string', start, startLine, startColumn, index);
                continue;
            }

            if ('{};'.includes(char)) {
                advance();
                push('symbol', start, startLine, startColumn, index);
                continue;
            }

            while (index < source.length) {
                if (source[index] === '\\' && index + 1 < source.length) {
                    advance();
                    advance();
                    continue;
                }
                if (/[\s#{};'\"]/.test(source[index])) break;
                advance();
            }
            push('text', start, startLine, startColumn, index);
        }

        return tokens;
    }

    function splitInlineComment(value) {
        const source = String(value || '');
        let quote = '';
        for (let index = 0; index < source.length; index += 1) {
            const char = source[index];
            if (char === '\\') {
                index += 1;
                continue;
            }
            if (quote) {
                if (char === quote) quote = '';
                continue;
            }
            if (char === '"' || char === "'") {
                quote = char;
                continue;
            }
            if (char === '#') {
                return { content: source.slice(0, index), comment: source.slice(index) };
            }
        }
        return { content: source, comment: '' };
    }

    function makeIssue(code, message, token) {
        return {
            code,
            message,
            index: token ? token.start : 0,
            line: token ? token.line : 1,
            column: token ? token.column : 1,
        };
    }

    function isContentToken(token) {
        return token.type === 'string' || (token.type === 'text' && Boolean(token.value.trim()));
    }

    function analyzeNginx(input) {
        const tokens = tokenizeNginx(input);
        const issues = [];
        const blockStack = [];
        let pending = [];
        let directiveCount = 0;
        let blockCount = 0;
        let commentCount = 0;
        let maxDepth = 0;

        tokens.forEach((token) => {
            if (token.type === 'comment') {
                commentCount += 1;
                return;
            }

            if (token.type === 'string') {
                if (token.value.length < 2 || token.value.at(-1) !== token.value[0]) {
                    issues.push(makeIssue('unclosed-quote', '引号未闭合', token));
                }
                pending.push(token);
                return;
            }

            if (token.type === 'newline' || (token.type === 'text' && !token.value.trim())) {
                return;
            }

            if (token.type !== 'symbol') {
                pending.push(token);
                return;
            }

            if (token.value === ';') {
                if (!pending.some(isContentToken)) {
                    issues.push(makeIssue('empty-directive', '分号前缺少指令内容', token));
                } else {
                    directiveCount += 1;
                }
                pending = [];
                return;
            }

            if (token.value === '{') {
                if (!pending.some(isContentToken)) {
                    issues.push(makeIssue('missing-block-header', '左花括号前缺少配置块声明', token));
                }
                blockStack.push(token);
                blockCount += 1;
                maxDepth = Math.max(maxDepth, blockStack.length);
                pending = [];
                return;
            }

            if (pending.some(isContentToken)) {
                issues.push(makeIssue('missing-semicolon', '右花括号前的指令缺少分号', pending[0]));
                pending = [];
            }
            if (!blockStack.length) {
                issues.push(makeIssue('unexpected-closing-brace', '存在多余的右花括号', token));
            } else {
                blockStack.pop();
            }
        });

        if (pending.some(isContentToken)) {
            issues.push(makeIssue('missing-semicolon', '文件结尾的指令缺少分号', pending[0]));
        }
        blockStack.forEach((token) => {
            issues.push(makeIssue('unclosed-block', '配置块缺少右花括号', token));
        });

        return { tokens, directiveCount, blockCount, commentCount, maxDepth, issues };
    }

    function normalizeParts(parts) {
        const values = [];
        parts.forEach((token) => {
            if (token.type === 'string') {
                values.push(token.value);
                return;
            }
            const value = token.value.trim();
            if (value) values.push(value);
        });
        return values.join(' ');
    }

    function formatNginx(input, options) {
        const indentSize = Number.isInteger(options?.indentSize) && options.indentSize > 0
            ? options.indentSize
            : 4;
        const analysis = analyzeNginx(input);
        const summary = {
            directiveCount: analysis.directiveCount,
            blockCount: analysis.blockCount,
            commentCount: analysis.commentCount,
            maxDepth: analysis.maxDepth,
            issues: analysis.issues,
        };

        if (analysis.issues.length) {
            return { formatted: '', ...summary };
        }

        const lines = [];
        let depth = 0;
        let pending = [];
        let lastEmissionSourceLine = 0;

        function emit(content, targetDepth, sourceLine) {
            const clean = content.trimEnd();
            if (!clean) return;
            lines.push(`${' '.repeat(targetDepth * indentSize)}${clean}`);
            lastEmissionSourceLine = sourceLine;
        }

        analysis.tokens.forEach((token) => {
            if (token.type === 'newline') {
                if (!pending.some(isContentToken) && !pending.some(item => item.type === 'comment')) {
                    pending = [];
                }
                return;
            }

            if (token.type === 'comment') {
                if (pending.some(isContentToken)) {
                    pending.push(token);
                    return;
                }
                pending = [];
                if (lastEmissionSourceLine === token.line && lines.length) {
                    lines[lines.length - 1] += ` ${token.value}`;
                } else {
                    emit(token.value, depth, token.line);
                }
                return;
            }

            if (token.type !== 'symbol') {
                pending.push(token);
                return;
            }

            const inlineComments = pending.filter(item => item.type === 'comment');
            const content = normalizeParts(pending.filter(item => item.type !== 'comment'));
            const commentSuffix = inlineComments.length
                ? ` ${inlineComments.map(item => item.value).join(' ')}`
                : '';

            if (token.value === ';') {
                emit(`${content};${commentSuffix}`, depth, token.line);
                pending = [];
                return;
            }

            if (token.value === '{') {
                emit(`${content} {${commentSuffix}`, depth, token.line);
                depth += 1;
                pending = [];
                return;
            }

            depth = Math.max(0, depth - 1);
            emit('}', depth, token.line);
            pending = [];
        });

        pending.filter(token => token.type === 'comment').forEach((token) => {
            emit(token.value, depth, token.line);
        });

        const formatted = lines.map(line => line.trimEnd()).join('\n').trim();
        return { formatted, ...summary };
    }

    function buildNginxTree(input) {
        const root = { type: 'root', children: [] };
        const stack = [root];

        String(input || '').split(/\r?\n/).forEach((rawLine, index) => {
            const value = rawLine.trim();
            if (!value) return;
            const line = index + 1;

            if (/^}\s*(?:#.*)?$/.test(value)) {
                if (stack.length > 1) {
                    const block = stack.pop();
                    block.closing = value;
                    block.closingLine = line;
                }
                return;
            }

            if (/\{(?:\s*#.*)?$/.test(value)) {
                const block = {
                    type: 'block',
                    opening: value,
                    closing: '',
                    line,
                    closingLine: null,
                    children: []
                };
                stack[stack.length - 1].children.push(block);
                stack.push(block);
                return;
            }

            stack[stack.length - 1].children.push({
                type: value.startsWith('#') ? 'comment' : 'directive',
                value,
                line
            });
        });

        return root;
    }

    function getNodeSource(input, node) {
        const lines = String(input || '').split(/\r?\n/);
        const start = Math.max(0, Number(node && node.line) - 1);
        const end = Math.max(start + 1, Number(node && (node.closingLine || node.line)));
        return lines.slice(start, end).join('\n');
    }

    function replaceNodeSource(input, node, replacement) {
        const lines = String(input || '').split(/\r?\n/);
        const start = Math.max(0, Number(node && node.line) - 1);
        const end = Math.max(start + 1, Number(node && (node.closingLine || node.line)));
        const replacementLines = String(replacement || '').split(/\r?\n/);
        lines.splice(start, end - start, ...replacementLines);
        return lines.join('\n');
    }

    function removeNodeSource(input, node) {
        const lines = String(input || '').split(/\r?\n/);
        const start = Math.max(0, Number(node && node.line) - 1);
        const end = Math.max(start + 1, Number(node && (node.closingLine || node.line)));
        lines.splice(start, end - start);
        return lines.join('\n');
    }

    return {
        tokenizeNginx,
        analyzeNginx,
        formatNginx,
        buildNginxTree,
        splitInlineComment,
        getNodeSource,
        replaceNodeSource,
        removeNodeSource
    };
});
