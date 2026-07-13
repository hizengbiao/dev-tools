(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }
    root.HtmlFormatter = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    const VOID_ELEMENTS = new Set([
        'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta',
        'param', 'source', 'track', 'wbr',
    ]);
    const RAW_ELEMENTS = new Set(['script', 'style', 'pre', 'textarea']);
    const INLINE_ELEMENTS = new Set([
        'a', 'abbr', 'b', 'bdi', 'bdo', 'cite', 'code', 'data', 'del', 'em', 'i', 'ins',
        'kbd', 'mark', 'q', 's', 'samp', 'small', 'span', 'strong', 'sub', 'sup', 'time', 'u', 'var',
    ]);

    function readTag(source, start) {
        if (source.startsWith('<!--', start)) {
            const end = source.indexOf('-->', start + 4);
            return { value: source.slice(start, end < 0 ? source.length : end + 3), end: end < 0 ? source.length : end + 3 };
        }

        let quote = '';
        let index = start + 1;
        for (; index < source.length; index += 1) {
            const char = source[index];
            if (quote) {
                if (char === quote) quote = '';
            } else if (char === '"' || char === "'") {
                quote = char;
            } else if (char === '>') {
                index += 1;
                break;
            }
        }
        return { value: source.slice(start, index), end: index };
    }

    function describeTag(value) {
        if (/^<!--/.test(value)) return { type: 'comment', value };
        if (/^<!|^<\?/.test(value)) return { type: 'declaration', value };
        const closingMatch = value.match(/^<\s*\/\s*([\w:-]+)/);
        if (closingMatch) return { type: 'tag', value, name: closingMatch[1].toLowerCase(), closing: true };
        const openingMatch = value.match(/^<\s*([\w:-]+)/);
        if (!openingMatch) return { type: 'text', value };
        const name = openingMatch[1].toLowerCase();
        return {
            type: 'tag',
            value,
            name,
            closing: false,
            selfClosing: /\/\s*>$/.test(value) || VOID_ELEMENTS.has(name),
        };
    }

    function tokenizeHtml(input) {
        const source = String(input || '');
        const tokens = [];
        let index = 0;

        while (index < source.length) {
            if (source[index] !== '<') {
                const start = index;
                const nextTag = source.indexOf('<', index);
                const end = nextTag < 0 ? source.length : nextTag;
                tokens.push({ type: 'text', value: source.slice(index, end), start, end });
                index = end;
                continue;
            }

            const start = index;
            const tag = readTag(source, index);
            const token = { ...describeTag(tag.value), start, end: tag.end };
            tokens.push(token);
            index = tag.end;

            if (token.type === 'tag' && !token.closing && !token.selfClosing && RAW_ELEMENTS.has(token.name)) {
                const closingPattern = new RegExp(`<\\s*\\/\\s*${token.name}\\s*>`, 'ig');
                closingPattern.lastIndex = index;
                const closingMatch = closingPattern.exec(source);
                if (closingMatch) {
                    tokens.push({
                        type: 'raw',
                        value: source.slice(index, closingMatch.index),
                        name: token.name,
                        start: index,
                        end: closingMatch.index,
                    });
                    tokens.push({
                        ...describeTag(closingMatch[0]),
                        start: closingMatch.index,
                        end: closingMatch.index + closingMatch[0].length,
                    });
                    index = closingMatch.index + closingMatch[0].length;
                } else {
                    tokens.push({ type: 'raw', value: source.slice(index), name: token.name, start: index, end: source.length });
                    index = source.length;
                }
            }
        }
        return tokens;
    }

    function normalizeText(value) {
        return value.replace(/\s+/g, ' ').trim();
    }

    function findInlineContentEnd(tokens, startIndex) {
        const opening = tokens[startIndex];
        let nestedDepth = 0;
        let hasDirectText = false;

        for (let index = startIndex + 1; index < tokens.length; index += 1) {
            const token = tokens[index];
            if (token.type === 'raw') return -1;
            if (token.type === 'text' && nestedDepth === 0 && normalizeText(token.value)) {
                hasDirectText = true;
            }
            if (token.type !== 'tag') continue;

            if (token.closing && token.name === opening.name && nestedDepth === 0) {
                return hasDirectText ? index : -1;
            }
            if (!token.closing && !token.selfClosing) {
                if (!INLINE_ELEMENTS.has(token.name)) return -1;
                nestedDepth += 1;
            } else if (token.closing) {
                nestedDepth = Math.max(0, nestedDepth - 1);
            }
        }
        return -1;
    }

    function serializeInlineContent(tokens, startIndex, endIndex) {
        return tokens.slice(startIndex, endIndex + 1).map((token) => {
            if (token.type === 'text') return token.value.replace(/\s+/g, ' ');
            return token.value.trim();
        }).join('').trim();
    }

    function formatRawContent(value, depth, indent) {
        const lines = value.replace(/^\s*\n|\n\s*$/g, '').split(/\r?\n/);
        if (lines.length === 1 && !lines[0].trim()) return [];
        return lines.map((line) => `${indent.repeat(depth)}${line.trimEnd()}`);
    }

    function formatHtml(input, options = {}) {
        const source = String(input || '').trim();
        if (!source) return '';
        const indentSize = Math.min(8, Math.max(1, Number(options.indentSize) || 2));
        const indent = ' '.repeat(indentSize);
        const tokens = tokenizeHtml(source);
        const lines = [];
        let depth = 0;

        for (let index = 0; index < tokens.length; index += 1) {
            const token = tokens[index];
            const next = tokens[index + 1];
            const afterNext = tokens[index + 2];

            if (token.type === 'text') {
                const text = normalizeText(token.value);
                if (text) lines.push(`${indent.repeat(depth)}${text}`);
                continue;
            }
            if (token.type === 'raw') {
                lines.push(...formatRawContent(token.value, depth, indent));
                continue;
            }
            if (token.type === 'comment' || token.type === 'declaration') {
                lines.push(`${indent.repeat(depth)}${token.value.trim()}`);
                continue;
            }
            if (token.closing) {
                depth = Math.max(0, depth - 1);
                lines.push(`${indent.repeat(depth)}${token.value.trim()}`);
                continue;
            }

            const inlineContentEnd = token.selfClosing ? -1 : findInlineContentEnd(tokens, index);
            if (inlineContentEnd > index) {
                lines.push(`${indent.repeat(depth)}${serializeInlineContent(tokens, index, inlineContentEnd)}`);
                index = inlineContentEnd;
                continue;
            }

            if (!token.selfClosing
                && next && next.type === 'text' && normalizeText(next.value)
                && afterNext && afterNext.type === 'tag' && afterNext.closing && afterNext.name === token.name) {
                lines.push(`${indent.repeat(depth)}${token.value.trim()}${normalizeText(next.value)}${afterNext.value.trim()}`);
                index += 2;
                continue;
            }

            lines.push(`${indent.repeat(depth)}${token.value.trim()}`);
            if (!token.selfClosing) depth += 1;
        }
        return lines.join('\n');
    }

    function compressHtml(input) {
        return tokenizeHtml(input).map((token) => {
            if (token.type === 'text') return normalizeText(token.value);
            if (token.type === 'raw') return token.value.trim();
            return token.value.trim();
        }).join('');
    }

    function repairHtml(input, options = {}) {
        const tokens = tokenizeHtml(input);
        const stack = [];
        const repaired = [];

        tokens.forEach((token) => {
            if (token.type !== 'tag') {
                repaired.push(token.value);
                return;
            }
            if (!token.closing) {
                repaired.push(token.value);
                if (!token.selfClosing) stack.push(token.name);
                return;
            }

            const matchingIndex = stack.lastIndexOf(token.name);
            if (matchingIndex < 0) return;
            while (stack.length - 1 > matchingIndex) {
                repaired.push(`</${stack.pop()}>`);
            }
            stack.pop();
            repaired.push(token.value);
        });

        while (stack.length) repaired.push(`</${stack.pop()}>`);
        return formatHtml(repaired.join(''), options);
    }

    function buildHtmlTree(input) {
        const root = { type: 'root', children: [] };
        const stack = [root];

        tokenizeHtml(input).forEach((token) => {
            const parent = stack[stack.length - 1];
            if (token.type === 'tag' && !token.closing) {
                const node = {
                    type: 'element',
                    name: token.name,
                    opening: token.value.trim(),
                    closing: token.selfClosing ? '' : `</${token.name}>`,
                    selfClosing: token.selfClosing,
                    children: []
                };
                parent.children.push(node);
                if (!token.selfClosing) stack.push(node);
                return;
            }
            if (token.type === 'tag' && token.closing) {
                const matchingIndex = stack.map(node => node.name).lastIndexOf(token.name);
                if (matchingIndex > 0) {
                    stack[matchingIndex].closing = token.value.trim();
                    stack.length = matchingIndex;
                }
                return;
            }

            const value = token.type === 'text' ? normalizeText(token.value) : token.value.trim();
            if (!value) return;
            parent.children.push({ type: token.type, value });
        });

        return root;
    }

    function findMatchingTagAroundCursor(input, cursorPos) {
        const source = String(input || '');
        const tokens = tokenizeHtml(source);
        const probes = [cursorPos - 1, cursorPos].filter((value, index, values) => (
            value >= 0 && value < source.length && values.indexOf(value) === index
        ));
        const tokenIndex = probes.reduce((found, probe) => {
            if (found >= 0) return found;
            return tokens.findIndex(token => (
                token.type === 'tag'
                && !token.selfClosing
                && probe >= token.start
                && probe < token.end
            ));
        }, -1);
        if (tokenIndex < 0) return null;

        const pairs = new Map();
        const stack = [];
        tokens.forEach((token, index) => {
            if (token.type !== 'tag' || token.selfClosing) return;
            if (!token.closing) {
                stack.push(index);
                return;
            }
            const stackIndex = stack.map(openIndex => tokens[openIndex].name).lastIndexOf(token.name);
            if (stackIndex < 0) return;
            const openIndex = stack[stackIndex];
            pairs.set(openIndex, index);
            pairs.set(index, openIndex);
            stack.length = stackIndex;
        });

        const match = tokens[pairs.get(tokenIndex)];
        if (!match) return null;
        return {
            start: match.start,
            end: match.end,
            value: match.value,
            name: match.name,
            closing: Boolean(match.closing),
        };
    }

    function analyzeHtml(input) {
        const stack = [];
        const issues = [];
        let elementCount = 0;
        let maxDepth = 0;

        tokenizeHtml(input).forEach((token) => {
            if (token.type !== 'tag') return;
            if (!token.closing) {
                elementCount += 1;
                if (!token.selfClosing) {
                    stack.push(token.name);
                    maxDepth = Math.max(maxDepth, stack.length);
                }
                return;
            }

            const matchingIndex = stack.lastIndexOf(token.name);
            if (matchingIndex < 0) {
                issues.push(`结束标签 </${token.name}> 没有对应的开始标签`);
                return;
            }
            while (stack.length - 1 > matchingIndex) {
                issues.push(`标签 <${stack.pop()}> 未在 </${token.name}> 前闭合`);
            }
            stack.pop();
        });

        while (stack.length) {
            issues.push(`标签 <${stack.pop()}> 缺少结束标签`);
        }
        return { elementCount, maxDepth, issues };
    }

    return { tokenizeHtml, formatHtml, compressHtml, repairHtml, buildHtmlTree, findMatchingTagAroundCursor, analyzeHtml };
});
