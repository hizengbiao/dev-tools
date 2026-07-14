# Nginx Formatter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增一个纯前端 Nginx 配置格式化与结构级语法检查工具，并在格式化后完整保留注释。

**Architecture:** 使用独立 UMD 模块逐字符扫描 Nginx 配置，生成带位置的标记，再由分析器完成结构校验和统计，由格式化器消费同一标记流输出四空格缩进文本。页面只负责输入、状态、结果切换、复制和示例加载；首页、导航、文档及冒烟清单沿用现有工具注册模式。

**Tech Stack:** 原生 HTML/CSS/JavaScript、Node.js CommonJS 测试、项目现有 `clipboard-utils.js` 与 `editor-lines.js`。

## Global Constraints

- 所有解析和格式化均在浏览器本地完成，无构建步骤、后端或外部依赖。
- 默认缩进固定为四个空格。
- 保留独立注释、行尾注释、注释文本和相对归属。
- 仅检查花括号、分号、单双引号、注释和指令基本结构，不校验指令名称、参数数量或上下文。
- 结构错误时返回全部可定位问题，不生成格式化结果，也不自动修复输入。
- 引号内的 `#`、`;`、`{`、`}` 必须作为普通字符处理。
- 输出统一使用 `\n` 换行，去除行尾空格和多余首尾空行。

## File Structure

- Create: `nginx-formatter.js` — 分词、位置计算、结构分析、统计和格式化的唯一核心模块。
- Create: `nginx-formatter.html` — 编辑器页面、状态展示、视图切换和用户操作。
- Create: `tests/nginx-formatter.test.cjs` — 核心行为及页面契约测试。
- Modify: `nav.js` — 注册 Nginx 工具，交由现有新工具迁移逻辑加入导航。
- Modify: `index.html` — 新增首页工具卡片。
- Modify: `browser-smoke-manifest.js` — 新增静态与真实浏览器冒烟条目。
- Modify: `tests/tool-registry.test.cjs` — 固定新工具的注册位置、图标和文档覆盖。
- Modify: `README.md` — 补充用户可见工具说明。
- Modify: `DEVELOPMENT.md` — 补充开发者工具清单。

---

### Task 1: 词法扫描与结构级语法检查

**Files:**
- Create: `nginx-formatter.js`
- Create: `tests/nginx-formatter.test.cjs`

**Interfaces:**
- Produces: `tokenizeNginx(input: unknown): Token[]`
- Produces: `analyzeNginx(input: unknown): Analysis`
- `Token` fields: `{ type, value, start, end, line, column }`；`type` 为 `text`、`string`、`comment`、`symbol` 或 `newline`。
- `Analysis` fields: `{ tokens, directiveCount, blockCount, commentCount, maxDepth, issues }`。
- `Issue` fields: `{ code, message, index, line, column }`，其中 `line` 和 `column` 从 1 开始。

- [ ] **Step 1: 写入会失败的分词与校验测试**

在 `tests/nginx-formatter.test.cjs` 写入：

```js
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const formatter = require(path.join(root, 'nginx-formatter.js'));

const quoted = 'set $value "# not a comment; { }"; # real comment';
const tokens = formatter.tokenizeNginx(quoted);
assert.strictEqual(tokens.filter(token => token.type === 'comment').length, 1);
assert.strictEqual(tokens.find(token => token.type === 'string').value, '"# not a comment; { }"');
assert.ok(formatter.tokenizeNginx('set $value foo\\ bar;').some(token => token.value === 'foo\\ bar'));

assert.deepStrictEqual(
    formatter.analyzeNginx('http { server { listen 80; } }'),
    {
        tokens: formatter.tokenizeNginx('http { server { listen 80; } }'),
        directiveCount: 1,
        blockCount: 2,
        commentCount: 0,
        maxDepth: 2,
        issues: [],
    }
);

const unmatchedClose = formatter.analyzeNginx('server { listen 80; }}').issues;
assert.strictEqual(unmatchedClose[0].code, 'unexpected-closing-brace');
assert.deepStrictEqual(
    { line: unmatchedClose[0].line, column: unmatchedClose[0].column },
    { line: 1, column: 22 }
);

assert.match(
    formatter.analyzeNginx('server {\n    listen 80;').issues.map(issue => issue.code).join(','),
    /unclosed-block/
);
assert.match(formatter.analyzeNginx('listen 80').issues[0].code, /missing-semicolon/);
assert.match(formatter.analyzeNginx('set $x "abc').issues[0].code, /unclosed-quote/);
assert.match(formatter.analyzeNginx('{ listen 80; }').issues[0].code, /missing-block-header/);
assert.match(formatter.analyzeNginx(';').issues[0].code, /empty-directive/);
assert.deepStrictEqual(formatter.analyzeNginx('# comment only').issues, []);
```

- [ ] **Step 2: 运行测试并确认因模块缺失而失败**

Run: `node tests/nginx-formatter.test.cjs`

Expected: FAIL，包含 `Cannot find module` 和 `nginx-formatter.js`。

- [ ] **Step 3: 实现 UMD 外壳、逐字符扫描和位置工具**

在 `nginx-formatter.js` 写入 UMD 外壳，并实现以下扫描规则：

```js
(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
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
                while (index < source.length && source[index] !== '\n' && /\s/.test(source[index])) advance();
                push('text', start, startLine, startColumn, index);
                continue;
            }
            if (char === '#') {
                while (index < source.length && source[index] !== '\n') advance();
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
```

- [ ] **Step 4: 实现结构分析和稳定的问题代码**

在同一工厂函数中增加 `analyzeNginx`。忽略纯空白 `text` 和 `newline`；把 `comment` 计数但不加入当前指令；把 `{` 前积累的内容作为块头，把 `;` 前内容作为普通指令；遇到 `}` 时先检查是否存在未结束指令，再检查块栈。未闭合字符串通过字符串标记末字符是否等于首字符判断。问题位置使用触发标记的位置；文件尾缺分号使用最后一个有效标记的位置；未闭合块使用对应 `{` 的位置。

```js
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
        return token.type === 'string' || (token.type === 'text' && token.value.trim());
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
            if (token.type === 'newline' || (token.type === 'text' && !token.value.trim())) return;
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
        blockStack.forEach(token => issues.push(makeIssue('unclosed-block', '配置块缺少右花括号', token)));
        return { tokens, directiveCount, blockCount, commentCount, maxDepth, issues };
    }

    return { tokenizeNginx, analyzeNginx };
});
```

- [ ] **Step 5: 运行核心测试并确认精确行列定位**

Run: `node tests/nginx-formatter.test.cjs`

Expected: PASS，输出进程退出码 0；多余右花括号报告第 1 行第 22 列。

- [ ] **Step 6: 提交分词与结构检查**

```powershell
git add nginx-formatter.js tests/nginx-formatter.test.cjs
git commit -m "feat: validate nginx config structure"
```

---

### Task 2: 注释保留格式化与结构统计

**Files:**
- Modify: `nginx-formatter.js`
- Modify: `tests/nginx-formatter.test.cjs`

**Interfaces:**
- Consumes: `tokenizeNginx(input)` 和 `analyzeNginx(input)`。
- Produces: `formatNginx(input: unknown, options?: { indentSize?: number }): FormatResult`。
- `FormatResult` fields: `{ formatted, directiveCount, blockCount, commentCount, maxDepth, issues }`。

- [ ] **Step 1: 追加会失败的格式化、注释和幂等性测试**

在 `tests/nginx-formatter.test.cjs` 追加：

```js
const compact = 'http{server{listen 80;location /api {proxy_pass "http://upstream/#v1";}}}';
const expected = [
    'http {',
    '    server {',
    '        listen 80;',
    '        location /api {',
    '            proxy_pass "http://upstream/#v1";',
    '        }',
    '    }',
    '}',
].join('\n');
assert.strictEqual(formatter.formatNginx(compact).formatted, expected);
assert.strictEqual(formatter.formatNginx(expected).formatted, expected);

const comments = [
    '# global comment',
    'events { # block comment',
    'worker_connections 1024; # directive comment',
    '# inside comment',
    '}',
].join('\n');
assert.strictEqual(
    formatter.formatNginx(comments).formatted,
    [
        '# global comment',
        'events { # block comment',
        '    worker_connections 1024; # directive comment',
        '    # inside comment',
        '}',
    ].join('\n')
);

const customIndent = formatter.formatNginx('server { listen 80; }', { indentSize: 2 });
assert.strictEqual(customIndent.formatted, 'server {\n  listen 80;\n}');
assert.deepStrictEqual(
    {
        directives: customIndent.directiveCount,
        blocks: customIndent.blockCount,
        comments: customIndent.commentCount,
        depth: customIndent.maxDepth,
    },
    { directives: 1, blocks: 1, comments: 0, depth: 1 }
);

const invalidFormat = formatter.formatNginx('server { listen 80;');
assert.strictEqual(invalidFormat.formatted, '');
assert.ok(invalidFormat.issues.length > 0);
assert.strictEqual(formatter.formatNginx('# comment only').formatted, '# comment only');
```

- [ ] **Step 2: 运行测试并确认 `formatNginx` 尚未定义**

Run: `node tests/nginx-formatter.test.cjs`

Expected: FAIL，包含 `formatter.formatNginx is not a function`。

- [ ] **Step 3: 实现空白归一、行生成和注释归属**

在 `nginx-formatter.js` 的 UMD 工厂中增加：

```js
    function normalizeParts(parts) {
        let output = '';
        parts.forEach((token) => {
            if (token.type === 'string') {
                if (output && !/\s$/.test(output)) output += ' ';
                output += token.value;
                return;
            }
            const value = token.value.trim();
            if (!value) return;
            if (output && !/\s$/.test(output)) output += ' ';
            output += value;
        });
        return output.trim();
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
        if (analysis.issues.length) return { formatted: '', ...summary };

        const lines = [];
        let depth = 0;
        let pending = [];
        let lineHasSyntax = false;

        function emit(content, targetDepth = depth) {
            const clean = content.trimEnd();
            if (!clean) return;
            lines.push(`${' '.repeat(targetDepth * indentSize)}${clean}`);
            lineHasSyntax = true;
        }

        analysis.tokens.forEach((token) => {
            if (token.type === 'newline') {
                if (!pending.some(isContentToken)) pending = [];
                lineHasSyntax = false;
                return;
            }
            if (token.type === 'comment') {
                if (pending.some(isContentToken)) return pending.push(token);
                pending = [];
                if (lineHasSyntax && lines.length) {
                    lines[lines.length - 1] += ` ${token.value}`;
                } else {
                    emit(token.value);
                }
                return;
            }
            if (token.type !== 'symbol') {
                pending.push(token);
                return;
            }
            const comments = pending.filter(part => part.type === 'comment');
            const content = normalizeParts(pending.filter(part => part.type !== 'comment'));
            if (token.value === ';') {
                emit(`${content};${comments.length ? ` ${comments.map(item => item.value).join(' ')}` : ''}`);
                pending = [];
                return;
            }
            if (token.value === '{') {
                emit(`${content} {${comments.length ? ` ${comments.map(item => item.value).join(' ')}` : ''}`);
                depth += 1;
                pending = [];
                return;
            }
            depth = Math.max(0, depth - 1);
            emit('}', depth);
            pending = [];
        });

        pending.filter(token => token.type === 'comment').forEach(token => emit(token.value));
        const formatted = lines.map(line => line.trimEnd()).join('\n').trim();
        return { formatted, ...summary };
    }
```

调整注释处理，使同一物理行中 `{` 或 `;` 后的注释附加到刚输出的行，而换行后的注释以当前深度独立输出。为此保留 `lineHasSyntax`，并确保 `newline` 只改变注释归属，不把普通指令按换行提前结束。

- [ ] **Step 4: 导出格式化接口并运行测试**

把模块返回值改为：

```js
    return { tokenizeNginx, analyzeNginx, formatNginx };
```

Run: `node tests/nginx-formatter.test.cjs`

Expected: PASS，格式化结果、注释位置、统计、错误抑制和幂等性断言全部通过。

- [ ] **Step 5: 提交格式化能力**

```powershell
git add nginx-formatter.js tests/nginx-formatter.test.cjs
git commit -m "feat: format nginx config with comments"
```

---

### Task 3: Nginx 格式化页面与交互

**Files:**
- Create: `nginx-formatter.html`
- Modify: `tests/nginx-formatter.test.cjs`

**Interfaces:**
- Consumes: `NginxFormatter.formatNginx(input, { indentSize: 4 })`。
- Consumes: `ClipboardUtils.copyText(text)`、`EditorLines.refreshLineNumbers(textarea, gutter)` 和 `EditorLines.syncLineNumberScroll(textarea, gutter)`。
- Produces DOM ids: `nginx-input`、`nginx-output`、`format-btn`、`copy-btn`、`clear-btn`、`sample-btn`、`source-tab`、`result-tab`、`status-message`、`issue-list`、`directive-count`、`block-count`、`comment-count`、`max-depth`。

- [ ] **Step 1: 追加会失败的页面契约测试**

在 `tests/nginx-formatter.test.cjs` 追加：

```js
const page = fs.readFileSync(path.join(root, 'nginx-formatter.html'), 'utf8');
assert.match(page, /<title>Nginx 配置格式化工具<\/title>/);
assert.match(page, /<script src="nav\.js" defer><\/script>/);
assert.match(page, /<script src="clipboard-utils\.js"><\/script>/);
assert.match(page, /<script src="editor-lines\.js"><\/script>/);
assert.match(page, /<script src="nginx-formatter\.js"><\/script>/);
[
    'nginx-input', 'nginx-output', 'format-btn', 'copy-btn', 'clear-btn', 'sample-btn',
    'source-tab', 'result-tab', 'status-message', 'issue-list', 'directive-count',
    'block-count', 'comment-count', 'max-depth',
].forEach(id => assert.match(page, new RegExp(`id="${id}"`)));
assert.match(page, /const NGINX_INDENT_SIZE = 4;/);
assert.match(page, /NginxFormatter\.formatNginx/);
assert.match(page, /setOutput\(''\)/);
assert.match(page, /result\.issues\.length/);
```

- [ ] **Step 2: 运行测试并确认页面缺失**

Run: `node tests/nginx-formatter.test.cjs`

Expected: FAIL，包含 `ENOENT` 和 `nginx-formatter.html`。

- [ ] **Step 3: 创建与现有工具一致的页面骨架**

创建 `nginx-formatter.html`：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nginx 配置格式化工具</title>
    <link rel="stylesheet" href="nav.css">
    <script src="nav.js" defer></script>
    <script src="clipboard-utils.js"></script>
    <script src="editor-lines.js"></script>
    <script src="nginx-formatter.js"></script>
    <style>
        :root { --bg: #f4f6f8; --panel: #fff; --border: #d0d7de; --text: #24292f; --muted: #57606a; --accent: #0969da; --danger: #cf222e; }
        * { box-sizing: border-box; }
        body { margin: 0; padding: 14px 18px 16px; min-height: 100vh; color: var(--text); background: var(--bg); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
        .page-shell { width: 100%; max-width: 1500px; min-height: calc(100vh - 96px); margin: 0 auto; display: flex; flex-direction: column; }
        .main-actions, .summary { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        button { padding: 8px 12px; border: 1px solid var(--border); border-radius: 6px; background: #fff; font-weight: 600; cursor: pointer; }
        #format-btn { color: #fff; border-color: var(--accent); background: var(--accent); }
        .editor-container { flex: 1; min-height: 540px; margin-top: 12px; overflow: hidden; border: 1px solid var(--border); border-radius: 7px; background: var(--panel); }
        .editor-header { min-height: 48px; display: flex; justify-content: space-between; align-items: center; padding: 0 12px; border-bottom: 1px solid var(--border); background: #f6f8fa; }
        .tabs { align-self: stretch; display: flex; align-items: flex-end; }
        .tab { height: 40px; padding: 0 17px; border: 0; background: transparent; color: var(--muted); }
        .tab.active { color: var(--accent); background: #fff; }
        .view { display: none; height: calc(100% - 48px); }
        .view.active { display: grid; grid-template-columns: 52px minmax(0, 1fr); }
        .line-numbers { padding: 15px 9px; overflow: hidden; color: #8c959f; background: #f6f8fa; text-align: right; white-space: pre; font: 13px/1.5 Consolas, monospace; }
        textarea { width: 100%; height: 100%; min-height: 490px; padding: 15px; resize: none; border: 0; outline: 0; white-space: pre; font: 13px/1.5 Consolas, monospace; }
        #nginx-output { background: #fbfcfd; }
        #status-message { display: none; margin-top: 10px; padding: 8px 11px; border-radius: 6px; color: #1a7f37; background: #dafbe1; }
        #status-message.visible { display: block; }
        #status-message.error { color: var(--danger); background: #ffebe9; }
        #issue-list { margin: 6px 0 0; padding-left: 20px; }
        .summary span { color: var(--muted); font-size: 12px; }
        .summary strong { color: var(--text); }
    </style>
</head>
<body>
<main class="page-shell">
    <div class="main-actions">
        <button id="format-btn" type="button">格式化并检查</button>
        <button id="copy-btn" type="button">复制结果</button>
        <button id="clear-btn" type="button">清空</button>
        <button id="sample-btn" type="button">加载示例</button>
    </div>
    <div id="status-message" role="status"><span id="status-text"></span><ul id="issue-list"></ul></div>
    <section class="editor-container">
        <header class="editor-header">
            <div class="tabs"><button id="source-tab" class="tab active">原始配置</button><button id="result-tab" class="tab">格式化结果</button></div>
            <div class="summary"><span>指令 <strong id="directive-count">0</strong></span><span>配置块 <strong id="block-count">0</strong></span><span>注释 <strong id="comment-count">0</strong></span><span>最大深度 <strong id="max-depth">0</strong></span></div>
        </header>
        <div id="source-view" class="view active"><div id="input-lines" class="line-numbers">1</div><textarea id="nginx-input" spellcheck="false" aria-label="Nginx 原始配置"></textarea></div>
        <div id="result-view" class="view"><div id="output-lines" class="line-numbers">1</div><textarea id="nginx-output" readonly spellcheck="false" aria-label="格式化结果"></textarea></div>
    </section>
</main>
```

- [ ] **Step 4: 实现页面状态、格式化和视图切换**

在页面末尾加入脚本。使用局部 `showView(name)` 切换 `.active`；`renderSummary(result)` 更新四个统计值；`renderIssues(issues)` 用 `textContent` 创建列表项，显示 `第 X 行，第 Y 列：message`，避免把配置内容作为 HTML 插入。

```html
<script>
    const NGINX_INDENT_SIZE = 4;
    const input = document.getElementById('nginx-input');
    const output = document.getElementById('nginx-output');
    const status = document.getElementById('status-message');
    const statusText = document.getElementById('status-text');
    const issueList = document.getElementById('issue-list');
    const outputLines = document.getElementById('output-lines');

    function bindLineNumbers(textarea, gutter) {
        EditorLines.refreshLineNumbers(textarea, gutter);
        textarea.addEventListener('input', () => EditorLines.refreshLineNumbers(textarea, gutter));
        textarea.addEventListener('scroll', () => EditorLines.syncLineNumberScroll(textarea, gutter));
    }

    function setOutput(value) {
        output.value = value;
        EditorLines.refreshLineNumbers(output, outputLines);
    }

    function showView(name) {
        const resultActive = name === 'result';
        document.getElementById('source-view').classList.toggle('active', !resultActive);
        document.getElementById('result-view').classList.toggle('active', resultActive);
        document.getElementById('source-tab').classList.toggle('active', !resultActive);
        document.getElementById('result-tab').classList.toggle('active', resultActive);
    }

    function renderSummary(result) {
        document.getElementById('directive-count').textContent = result.directiveCount;
        document.getElementById('block-count').textContent = result.blockCount;
        document.getElementById('comment-count').textContent = result.commentCount;
        document.getElementById('max-depth').textContent = result.maxDepth;
    }

    function renderIssues(issues) {
        issueList.replaceChildren();
        issues.forEach((issue) => {
            const item = document.createElement('li');
            item.textContent = `第 ${issue.line} 行，第 ${issue.column} 列：${issue.message}`;
            issueList.appendChild(item);
        });
    }

    document.getElementById('format-btn').addEventListener('click', () => {
        if (!input.value.trim()) {
            status.className = 'visible error';
            statusText.textContent = '请输入 Nginx 配置。';
            setOutput('');
            renderIssues([]);
            showView('source');
            return;
        }
        const result = NginxFormatter.formatNginx(input.value, { indentSize: NGINX_INDENT_SIZE });
        renderSummary(result);
        renderIssues(result.issues);
        status.className = `visible${result.issues.length ? ' error' : ''}`;
        if (result.issues.length) {
            statusText.textContent = `发现 ${result.issues.length} 个结构问题。`;
            setOutput('');
            showView('source');
            return;
        }
        setOutput(result.formatted);
        statusText.textContent = '格式化和结构检查已完成。';
        showView('result');
    });

    document.getElementById('source-tab').addEventListener('click', () => showView('source'));
    document.getElementById('result-tab').addEventListener('click', () => showView('result'));
    document.getElementById('copy-btn').addEventListener('click', () => ClipboardUtils.copyText(output.value));
    document.getElementById('clear-btn').addEventListener('click', () => {
        input.value = '';
        setOutput('');
        status.className = '';
        renderSummary({ directiveCount: 0, blockCount: 0, commentCount: 0, maxDepth: 0 });
        renderIssues([]);
        showView('source');
        input.dispatchEvent(new Event('input'));
    });
    document.getElementById('sample-btn').addEventListener('click', () => {
        input.value = '# Web 服务示例\nhttp {\nserver { # HTTPS 服务\nlisten 443 ssl;\nlocation /api { proxy_pass http://backend; } # API 代理\n}\n}';
        input.dispatchEvent(new Event('input'));
        showView('source');
    });

    bindLineNumbers(input, document.getElementById('input-lines'));
    bindLineNumbers(output, outputLines);
</script>
```

- [ ] **Step 5: 运行页面契约和核心测试**

Run: `node tests/nginx-formatter.test.cjs`

Expected: PASS，页面脚本引用、元素 id、四空格常量、错误清空结果和核心格式化行为均通过。

- [ ] **Step 6: 提交页面**

```powershell
git add nginx-formatter.html tests/nginx-formatter.test.cjs
git commit -m "feat: add nginx formatter page"
```

---

### Task 4: 工具箱注册、文档与全量验证

**Files:**
- Modify: `nav.js`
- Modify: `index.html`
- Modify: `browser-smoke-manifest.js`
- Modify: `tests/tool-registry.test.cjs`
- Modify: `README.md`
- Modify: `DEVELOPMENT.md`

**Interfaces:**
- Consumes: `nginx-formatter.html` 中的 `#nginx-input` 与 `#format-btn`。
- Produces: 注册项 `{ name: 'Nginx 格式化', path: 'nginx-formatter.html', icon: '⚙️' }`。

- [ ] **Step 1: 先扩展注册测试并确认失败**

在 `tests/tool-registry.test.cjs` 中把 `nginx-formatter.html` 放到 `html-formatter.html` 后、`timestamp-converter.html` 前的两个 leading paths 数组，并加入：

```js
assert.strictEqual(toolByPath.get('nginx-formatter.html').icon, '⚙️');
assert.match(home, /href="nginx-formatter\.html"/);
assert.ok(readme.includes('nginx-formatter.html'));
assert.ok(development.includes('nginx-formatter.html'));
```

Run: `node tests/tool-registry.test.cjs`

Expected: FAIL，说明导航尚未包含 `nginx-formatter.html`。

- [ ] **Step 2: 注册导航和首页卡片**

在 `nav.js` 的 `html-formatter.html` 项之后新增：

```js
{ name: 'Nginx 格式化', path: 'nginx-formatter.html', icon: '⚙️' },
```

在 `index.html` 的 HTML 格式化卡片之后新增：

```html
<a href="nginx-formatter.html" class="tool-card">
    <span class="tool-icon" aria-hidden="true"></span>
    <h2>Nginx 配置格式化工具</h2>
    <p>格式化 Nginx 配置并检查括号、分号和引号等结构问题，完整保留独立及行尾注释。</p>
</a>
```

依赖现有 `migrateNewTools` 把新路径加入已有用户的导航配置，不新增一次性迁移函数或存储键。

- [ ] **Step 3: 注册冒烟测试**

在 `browser-smoke-manifest.js` 的 HTML 格式化项之后新增：

```js
{
    path: 'nginx-formatter.html',
    title: 'Nginx 配置格式化工具',
    markers: ['nginx-input', 'format-btn', 'issue-list'],
    selectors: ['#nginx-input', '#format-btn'],
},
```

Run: `node tests/browser-smoke.test.cjs`

Expected: PASS，静态页面标题、导航脚本及标记检查通过。

- [ ] **Step 4: 更新用户和开发文档**

在 `README.md` 的格式化工具区域新增：

```markdown
| [Nginx 配置格式化工具](nginx-formatter.html) | 格式化 Nginx 配置、保留注释，并检查花括号、分号和引号等结构问题。 |
```

在 `DEVELOPMENT.md` 的工具清单新增：

```markdown
| **Nginx 配置格式化** | `nginx-formatter.html` | 格式化 Nginx 配置、保留注释并进行结构级语法检查。 | Vanilla JS |
```

- [ ] **Step 5: 运行针对性测试**

```powershell
node tests/nginx-formatter.test.cjs
node tests/tool-registry.test.cjs
node tests/browser-smoke.test.cjs
```

Expected: 三个命令均退出码 0，分别输出 Nginx 工具通过、`tool registry consistency passed` 和 `browser smoke static checks passed`。

- [ ] **Step 6: 运行完整 Node 测试集**

Run:

```powershell
$failed = @()
Get-ChildItem tests -Filter '*.test.cjs' | ForEach-Object {
    node $_.FullName
    if ($LASTEXITCODE -ne 0) { $failed += $_.Name }
}
if ($failed.Count) { throw "Failed tests: $($failed -join ', ')" }
```

Expected: 所有 `tests/*.test.cjs` 均退出码 0，最终不抛出 `Failed tests`。

- [ ] **Step 7: 检查差异并提交集成修改**

```powershell
git diff --check
git status --short
git add nav.js index.html browser-smoke-manifest.js tests/tool-registry.test.cjs README.md DEVELOPMENT.md
git commit -m "feat: register nginx formatter tool"
```

Expected: `git diff --check` 无输出；提交仅包含列出的注册和文档文件。

---

## Final Verification

- [ ] Run: `node tests/nginx-formatter.test.cjs`
- [ ] Run: `node tests/tool-registry.test.cjs`
- [ ] Run: `node tests/browser-smoke.test.cjs`
- [ ] Run the complete `tests/*.test.cjs` PowerShell loop from Task 4.
- [ ] Run: `git status --short`
- [ ] Expected: 所有测试通过，工作区无未提交修改。
