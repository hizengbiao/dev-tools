# 正则表达式可视化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `regex-tester.html` 中增加可实时更新的正则表达式可视化弹窗，支持匹配路径图、语法树和分段说明三种视图。

**Architecture:** 新建无依赖的 `regex-visualizer.js`，以 UMD 方式同时暴露给浏览器和 Node 测试，负责标准化、解析并返回统一 AST。页面只负责弹窗状态、防抖刷新和三种视图渲染；解析失败时保留上一次成功 AST。

**Tech Stack:** 原生 HTML/CSS/JavaScript、Node.js `assert` 集成测试、浏览器 DOM

---

## 文件结构

- Create: `regex-visualizer.js`：正则标准化、递归下降解析、AST 说明和复杂度保护。
- Create: `tests/regex-visualizer.test.cjs`：直接测试解析器的节点结构、错误位置与限制。
- Modify: `regex-tester.html`：可视化入口、弹窗、三种渲染器、实时刷新、版本说明。
- Modify: `tests/regex-tester.test.cjs`：验证页面接线、弹窗结构、事件和版本信息。

### Task 1: 建立解析器接口与基础节点

**Files:**
- Create: `regex-visualizer.js`
- Create: `tests/regex-visualizer.test.cjs`

- [ ] **Step 1: 编写基础解析失败测试**

```js
const assert = require('node:assert');
const { parseRegexVisualization } = require('../regex-visualizer.js');

const result = parseRegexVisualization('^(1[3-9]\\d{2})\\d{3}(\\d{4})$', 'gm');
assert.equal(result.ok, true);
assert.equal(result.ast.type, 'expression');
assert.equal(result.flags, 'gm');
assert.equal(result.ast.children[0].type, 'sequence');
assert.equal(result.captureGroupCount, 2);
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node tests\regex-visualizer.test.cjs`

Expected: FAIL，提示找不到 `regex-visualizer.js`。

- [ ] **Step 3: 实现 UMD 导出、标准化和解析入口**

```js
(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    if (root) root.RegexVisualizer = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    const DEFAULT_LIMITS = { maxLength: 4000, maxNodes: 1200, maxDepth: 80 };

    function parseRegexVisualization(source, flags = '', limits = {}) {
        const options = { ...DEFAULT_LIMITS, ...limits };
        if (source.length > options.maxLength) {
            return createError(`正则长度不能超过 ${options.maxLength} 个字符`, options.maxLength);
        }

        try {
            const parser = new RegexParser(source, options);
            const ast = parser.parse();
            return {
                ok: true,
                ast,
                flags,
                captureGroupCount: parser.captureGroupCount,
                source
            };
        } catch (error) {
            return createError(error.message, error.index ?? 0, source);
        }
    }

    return { parseRegexVisualization };
});
```

实现 `RegexParser.parse()`、`parseAlternation()`、`parseSequence()`、`parseAtom()`，先支持表达式、顺序、字面量、锚点、转义、字符类和捕获分组。每个节点保存：

```js
{
    type: 'literal',
    raw: 'a',
    start: 0,
    end: 1,
    description: '匹配字符 a',
    children: []
}
```

- [ ] **Step 4: 运行基础测试确认通过**

Run: `node tests\regex-visualizer.test.cjs`

Expected: PASS。

- [ ] **Step 5: 提交基础解析器**

```powershell
git add regex-visualizer.js tests/regex-visualizer.test.cjs
git commit -m "新增正则可视化基础解析器"
```

### Task 2: 完整支持 JavaScript 正则结构和复杂度保护

**Files:**
- Modify: `regex-visualizer.js`
- Modify: `tests/regex-visualizer.test.cjs`

- [ ] **Step 1: 增加分支、量词、分组和错误测试**

```js
const branch = parseRegexVisualization('(?:ab|cd)+?', 'g');
assert.equal(branch.ok, true);
assert.equal(branch.ast.children[0].children[0].type, 'group');
assert.deepEqual(branch.ast.children[0].children[0].quantifier, {
    min: 1,
    max: Infinity,
    greedy: false,
    raw: '+?'
});

const named = parseRegexVisualization('(?<area>\\d{3})-(?=\\d{4})\\k<area>', 'u');
assert.equal(named.ok, true);
assert.equal(named.captureGroupCount, 1);

const invalid = parseRegexVisualization('(abc', 'g');
assert.equal(invalid.ok, false);
assert.equal(invalid.error.index, 0);

const tooDeep = parseRegexVisualization('((((a))))', '', { maxDepth: 2 });
assert.equal(tooDeep.ok, false);
assert.match(tooDeep.error.message, /嵌套层级/);
```

- [ ] **Step 2: 运行测试确认新增场景失败**

Run: `node tests\regex-visualizer.test.cjs`

Expected: FAIL 于量词、命名分组或复杂度断言。

- [ ] **Step 3: 补齐解析能力**

实现以下规则：

```js
parseAlternation(stopChar)       // sequence ('|' sequence)*
parseGroup()                     // (), (?:), (?=), (?!), (?<=), (?<!), (?<name>)
parseCharacterClass()            // [...], [^...]
parseEscape()                    // \d \w \s \b \1 \k<name> 及字面转义
parseQuantifier(node)            // * + ? {n} {n,} {n,m}，并识别尾随 ?
assertComplexity(depthIncrement) // maxNodes 与 maxDepth
```

未闭合分组、字符类、无效量词和悬空反斜杠必须抛出带 `index` 的解析错误。节点说明使用直观中文，例如 `\d` 为“匹配一个数字”，`{2,4}` 为“重复 2 到 4 次”。

- [ ] **Step 4: 增加 `(?i)` 标准化测试并实现**

```js
const inline = parseRegexVisualization('(?i)Call to address=(.+?) failed', 'gm');
assert.equal(inline.ok, true);
assert.equal(inline.source, 'Call to address=(.+?) failed');
assert.equal(inline.flags, 'gim');
```

在入口函数中移除表达式开头的 `(?i)`，将 `i` 合并到去重后的标志字符串，并在错误位置映射时补回被移除的字符偏移。

- [ ] **Step 5: 运行解析器测试确认通过**

Run: `node tests\regex-visualizer.test.cjs`

Expected: 输出 `regex visualizer parser passed`。

- [ ] **Step 6: 提交完整解析能力**

```powershell
git add regex-visualizer.js tests/regex-visualizer.test.cjs
git commit -m "完善正则可视化语法解析"
```

### Task 3: 添加可视化弹窗和三种视图容器

**Files:**
- Modify: `regex-tester.html`
- Modify: `tests/regex-tester.test.cjs`

- [ ] **Step 1: 编写页面结构失败测试**

在 `tests/regex-tester.test.cjs` 增加：

```js
assert.match(page, /<script src="regex-visualizer\.js"><\/script>/);
assert.match(page, /id="visualizeBtn"[^>]*>正则可视化<\/button>/);
assert.match(page, /id="regex-visualizer-modal"/);
assert.match(page, /data-view="railroad"[^>]*>匹配路径图/);
assert.match(page, /data-view="tree"[^>]*>语法树/);
assert.match(page, /data-view="explanation"[^>]*>分段说明/);
assert.match(page, /id="visualizerError"/);
assert.match(page, /id="railroadView"/);
assert.match(page, /id="treeView"/);
assert.match(page, /id="explanationView"/);
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node tests\regex-tester.test.cjs`

Expected: FAIL 于缺少 `visualizeBtn`。

- [ ] **Step 3: 添加入口和弹窗 HTML**

在匹配规则按钮组中加入：

```html
<button class="btn" id="visualizeBtn" type="button">正则可视化</button>
```

在版本说明弹窗前加入：

```html
<div id="regex-visualizer-modal" class="modal-overlay visualizer-modal" aria-hidden="true">
    <div class="modal-content visualizer-dialog" role="dialog" aria-modal="true" aria-labelledby="visualizerTitle">
        <div class="modal-header">
            <h3 id="visualizerTitle">正则表达式可视化</h3>
            <button class="close-modal" id="closeVisualizerBtn" type="button">&times;</button>
        </div>
        <div class="visualizer-toolbar" role="tablist">
            <button class="visualizer-tab active" data-view="railroad" role="tab">匹配路径图</button>
            <button class="visualizer-tab" data-view="tree" role="tab">语法树</button>
            <button class="visualizer-tab" data-view="explanation" role="tab">分段说明</button>
        </div>
        <div id="visualizerError" class="visualizer-error" aria-live="polite"></div>
        <div class="visualizer-body">
            <section id="railroadView" class="visualizer-view active"></section>
            <section id="treeView" class="visualizer-view"></section>
            <section id="explanationView" class="visualizer-view"></section>
        </div>
    </div>
</div>
<script src="regex-visualizer.js"></script>
```

- [ ] **Step 4: 添加响应式样式**

实现 `.visualizer-dialog`、`.visualizer-tab`、`.visualizer-view`、`.visualizer-error`、`.railroad-*`、`.syntax-tree` 和 `.explanation-table`。桌面弹窗最大宽度使用 `min(1400px, calc(100vw - 48px))`，最大高度 `calc(100vh - 48px)`；画布内部使用 `overflow: auto`。

- [ ] **Step 5: 运行页面结构测试确认通过**

Run: `node tests\regex-tester.test.cjs`

Expected: PASS。

- [ ] **Step 6: 提交弹窗骨架**

```powershell
git add regex-tester.html tests/regex-tester.test.cjs
git commit -m "新增正则可视化弹窗结构"
```

### Task 4: 实现三种 AST 渲染器

**Files:**
- Modify: `regex-tester.html`
- Modify: `tests/regex-tester.test.cjs`

- [ ] **Step 1: 增加渲染函数接线测试**

```js
assert.match(page, /function renderRailroadView\(ast\)/);
assert.match(page, /function renderSyntaxTree\(ast\)/);
assert.match(page, /function renderExplanationTable\(ast\)/);
assert.match(page, /function describeVisualizerNode\(node\)/);
assert.match(page, /data-node-raw=/);
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node tests\regex-tester.test.cjs`

Expected: FAIL 于缺少 `renderRailroadView`。

- [ ] **Step 3: 实现匹配路径图**

```js
function renderRailroadView(ast) {
    railroadView.innerHTML = `<div class="railroad-canvas">${renderRailroadNode(ast)}</div>`;
}

function renderRailroadNode(node) {
    if (node.type === 'alternation') {
        return `<div class="railroad-branch">${node.children.map(
            child => `<div class="railroad-branch-row">${renderRailroadNode(child)}</div>`
        ).join('')}</div>`;
    }

    if (node.type === 'sequence' || node.type === 'expression') {
        return `<div class="railroad-sequence">${node.children.map(renderRailroadNode).join('')}</div>`;
    }

    return `<span class="railroad-node railroad-${node.type}"
        data-node-raw="${escapeHtml(node.raw)}"
        title="${escapeHtml(describeVisualizerNode(node))}">
        ${escapeHtml(node.label || node.raw)}
        ${node.quantifier ? `<small>${escapeHtml(node.quantifier.raw)}</small>` : ''}
    </span>`;
}
```

分组节点必须包含分组标题和内部子路径；断言节点使用不同边框；分支通过 CSS 上下排列并使用局部连线。

- [ ] **Step 4: 实现语法树和说明表**

```js
function renderSyntaxTree(ast) {
    treeView.innerHTML = `<ul class="syntax-tree">${renderTreeNode(ast)}</ul>`;
}

function renderTreeNode(node) {
    return `<li>
        <details open>
            <summary><strong>${escapeHtml(node.label)}</strong> <code>${escapeHtml(node.raw)}</code></summary>
            <p>${escapeHtml(describeVisualizerNode(node))}</p>
            ${node.children.length ? `<ul>${node.children.map(renderTreeNode).join('')}</ul>` : ''}
        </details>
    </li>`;
}

function renderExplanationTable(ast) {
    const rows = flattenVisualizerNodes(ast);
    explanationView.innerHTML = `<table class="explanation-table">
        <thead><tr><th>片段</th><th>类型</th><th>含义</th><th>重复</th><th>分组</th></tr></thead>
        <tbody>${rows.map(renderExplanationRow).join('')}</tbody>
    </table>`;
}
```

- [ ] **Step 5: 运行页面测试确认通过**

Run: `node tests\regex-tester.test.cjs`

Expected: PASS。

- [ ] **Step 6: 提交三种渲染器**

```powershell
git add regex-tester.html tests/regex-tester.test.cjs
git commit -m "实现正则表达式三种可视化视图"
```

### Task 5: 实现实时时刷新、错误保留和视图切换

**Files:**
- Modify: `regex-tester.html`
- Modify: `tests/regex-tester.test.cjs`

- [ ] **Step 1: 增加状态与事件失败测试**

```js
assert.match(page, /let lastSuccessfulVisualization = null/);
assert.match(page, /let visualizerRefreshTimer = null/);
assert.match(page, /function scheduleVisualizerRefresh\(\)/);
assert.match(page, /setTimeout\(refreshRegexVisualization, 250\)/);
assert.match(page, /function refreshRegexVisualization\(\)/);
assert.match(page, /function showVisualizerError\(result\)/);
assert.match(page, /patternInput\.addEventListener\('input', scheduleVisualizerRefresh\)/);
assert.match(page, /control\.addEventListener\('change', scheduleVisualizerRefresh\)/);
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node tests\regex-tester.test.cjs`

Expected: FAIL 于缺少刷新状态。

- [ ] **Step 3: 实现弹窗生命周期和防抖**

```js
let lastSuccessfulVisualization = null;
let visualizerRefreshTimer = null;
let activeVisualizerView = 'railroad';

function scheduleVisualizerRefresh() {
    if (!isVisualizerOpen()) return;
    clearTimeout(visualizerRefreshTimer);
    visualizerRefreshTimer = setTimeout(refreshRegexVisualization, 250);
}

function refreshRegexVisualization() {
    const result = RegexVisualizer.parseRegexVisualization(
        patternInput.value,
        getFlagsForPattern(patternInput.value)
    );

    if (!result.ok) {
        showVisualizerError(result);
        if (lastSuccessfulVisualization) renderVisualization(lastSuccessfulVisualization, true);
        return;
    }

    lastSuccessfulVisualization = result;
    visualizerError.textContent = '';
    renderVisualization(result, false);
}
```

打开弹窗时立即刷新；关闭时清除计时器。页签点击只更新 `activeVisualizerView` 和 CSS 状态，不重新解析。

- [ ] **Step 4: 实现错误定位与上次结果提示**

错误区显示：

```text
解析失败：未闭合的分组（位置 5）
abc(def
     ^
以下仍显示上一次成功解析结果。
```

使用文本节点或 `escapeHtml` 输出错误上下文，禁止将原始正则直接拼入未转义 HTML。

- [ ] **Step 5: 运行页面和解析器测试**

Run:

```powershell
node tests\regex-visualizer.test.cjs
node tests\regex-tester.test.cjs
```

Expected: 两项均 PASS。

- [ ] **Step 6: 提交交互逻辑**

```powershell
git add regex-tester.html tests/regex-tester.test.cjs
git commit -m "完善正则可视化实时刷新与错误提示"
```

### Task 6: 更新版本并完成回归验证

**Files:**
- Modify: `regex-tester.html`
- Modify: `tests/regex-tester.test.cjs`

- [ ] **Step 1: 增加版本失败测试**

```js
assert.match(page, /<span>V1\.05<\/span>/);
assert.match(page, /<div class="changelog-date">2026年6月18日<\/div>/);
assert.match(page, /新增正则表达式可视化，支持匹配路径图、语法树和分段说明三种视图，并提供实时解析与错误定位。/);
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node tests\regex-tester.test.cjs`

Expected: FAIL，当前版本仍为 V1.04。

- [ ] **Step 3: 更新版本号与版本说明**

将页头版本改为 `V1.05`，并在版本更新说明顶部加入 `2026年6月18日` 与规格中的说明文本。

- [ ] **Step 4: 运行全部自动测试**

Run:

```powershell
node tests\regex-visualizer.test.cjs
node tests\regex-tester.test.cjs
node tests\json-parser-hang.test.cjs
node tests\text-case-converter.test.cjs
node tests\text-escape-formatter.test.cjs
git diff --check
```

Expected: 所有测试 PASS，`git diff --check` 无输出。

- [ ] **Step 5: 浏览器验收**

启动本地静态服务并在桌面和窄屏验证：

1. 默认正则打开弹窗后显示三种视图。
2. 三个页签切换不触发错误。
3. 修改规则后约 250 毫秒自动更新。
4. 输入 `(abc` 后显示错误位置，同时保留旧图。
5. 修改正则标志后自动刷新。
6. 复杂路径图可以横向滚动。
7. 关闭弹窗后原测试内容、匹配结果和替换结果不变。
8. 控制台无错误。

- [ ] **Step 6: 提交版本与验收结果**

```powershell
git add regex-tester.html tests/regex-tester.test.cjs regex-visualizer.js tests/regex-visualizer.test.cjs
git commit -m "完成正则表达式可视化功能"
```
