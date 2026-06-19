# 正则可视化展示规范化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让四种正则可视化视图统一支持连续字符合并、字面转义解码和字符集合纵向拆分。

**Architecture:** 新建 `regex-display-model.js`，将语法 AST 转换为不含 HTML 的 Display AST。匹配路径图、正则流程图、语法树和分段说明都只消费 Display AST；原始 AST、错误位置和匹配行为不变。

**Tech Stack:** 原生 JavaScript、HTML/CSS、SVG、Node.js `assert`

---

## 文件结构

- Create: `regex-display-model.js`：AST 规范化、字面合并、转义解码、字符集合拆分。
- Create: `tests/regex-display-model.test.cjs`：展示模型行为测试。
- Modify: `regex-flow-layout.js`：使用 `displayText`、`characterItems` 和可变节点高度。
- Modify: `tests/regex-flow-layout.test.cjs`：流程图展示模型布局测试。
- Modify: `regex-tester.html`：统一生成 Display AST 并接入四种视图。
- Modify: `tests/regex-tester.test.cjs`：脚本接线、四视图展示字段和版本测试。

### Task 1: 建立 Display AST 和字面合并

**Files:**
- Create: `regex-display-model.js`
- Create: `tests/regex-display-model.test.cjs`

- [ ] **Step 1: 编写失败测试**

```js
const assert = require('node:assert/strict');
const { parseRegexVisualization } = require('../regex-visualizer.js');
const { createRegexDisplayModel } = require('../regex-display-model.js');

function display(pattern) {
    const parsed = parseRegexVisualization(pattern);
    assert.equal(parsed.ok, true);
    return createRegexDisplayModel(parsed.ast);
}

const localhost = display('localhost');
const localhostNode = localhost.children[0].children[0];
assert.equal(localhostNode.type, 'literalRun');
assert.equal(localhostNode.raw, 'localhost');
assert.equal(localhostNode.displayText, 'localhost');
```

- [ ] **Step 2: 运行测试确认模块缺失**

Run: `node tests\regex-display-model.test.cjs`

Expected: FAIL，提示找不到 `regex-display-model.js`。

- [ ] **Step 3: 实现 UMD 导出和基础复制**

```js
(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    if (root) root.RegexDisplayModel = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    function createRegexDisplayModel(ast) {
        return normalizeNode(ast);
    }

    return { createRegexDisplayModel };
});
```

`normalizeNode` 复制节点的 `type/raw/start/end/description/quantifier/groupKind/groupNumber/groupName`，并初始化：

```js
{
    displayText,
    characterItems: [],
    sourceNodes: [],
    children: normalizedChildren
}
```

- [ ] **Step 4: 实现 sequence 内合并**

`normalizeSequenceChildren(children)` 只合并同一个 sequence 的直接子节点：

```js
function isMergeableLiteral(node) {
    return (
        !node.quantifier
        && (node.type === 'literal' || isLiteralEscape(node))
    );
}
```

相邻节点合并为：

```js
{
    type: 'literalRun',
    raw: sourceNodes.map(node => node.raw).join(''),
    displayText: sourceNodes.map(getLiteralDisplayText).join(''),
    start: sourceNodes[0].start,
    end: sourceNodes[sourceNodes.length - 1].end,
    description: '连续字面字符',
    sourceNodes,
    children: [],
    characterItems: []
}
```

- [ ] **Step 5: 增加合并边界测试**

```js
assert.equal(display('a+bc').children[0].children[0].displayText, 'a');
assert.equal(display('a+bc').children[0].children[1].displayText, 'bc');

const branch = display('ab|cd').children[0];
assert.deepEqual(
    branch.children.map(sequence => sequence.children[0].displayText),
    ['ab', 'cd']
);
```

- [ ] **Step 6: 运行测试并提交**

Run:

```powershell
node tests\regex-display-model.test.cjs
git diff --check
```

Expected: 输出 `regex display model passed`。

```powershell
git add regex-display-model.js tests/regex-display-model.test.cjs
git commit -m "新增正则展示模型与字面合并"
```

### Task 2: 实现转义解码和字符集合拆分

**Files:**
- Modify: `regex-display-model.js`
- Modify: `tests/regex-display-model.test.cjs`

- [ ] **Step 1: 增加字面转义失败测试**

```js
const escapedUrl = display('http:\\/\\/example\\.com').children[0].children[0];
assert.equal(escapedUrl.type, 'literalRun');
assert.equal(escapedUrl.raw, 'http:\\/\\/example\\.com');
assert.equal(escapedUrl.displayText, 'http://example.com');

assert.equal(display('\\x2e').children[0].children[0].displayText, '.');
assert.equal(display('\\u002e').children[0].children[0].displayText, '.');
```

- [ ] **Step 2: 实现字面解码**

实现 `decodeLiteralEscape(node)`：

- 标点字面转义移除一个反斜杠。
- `\xNN`、`\uNNNN`、`\u{...}` 解码为字符。
- 控制字符返回 `mergeable: false` 和中文展示文字。
- `\d`、`\s`、`\b` 等返回语义中文且 `mergeable: false`。
- 反向引用不解码。

- [ ] **Step 3: 增加语义转义测试**

```js
assert.equal(display('\\d').children[0].children[0].displayText, '数字');
assert.equal(display('\\s').children[0].children[0].displayText, '空白字符');
assert.equal(display('\\b').children[0].children[0].displayText, '单词边界');
assert.equal(display('a\\db').children[0].children.length, 3);
```

- [ ] **Step 4: 增加字符集合失败测试**

```js
const characterClass = display('[a-zA-Z0-9-]').children[0].children[0];
assert.equal(characterClass.type, 'characterClass');
assert.deepEqual(characterClass.characterItems, ['a-z', 'A-Z', '0-9', '-']);
assert.equal(characterClass.negated, false);

const negated = display('[^\\s-]').children[0].children[0];
assert.equal(negated.negated, true);
assert.deepEqual(negated.characterItems, ['空白字符', '-']);
```

- [ ] **Step 5: 实现字符集合扫描器**

实现 `parseCharacterClassItems(raw)`：

- 去除外层方括号和开头否定符。
- 逐项解析转义、范围和单字符。
- `x-y` 仅在中间连字符未转义且两端存在时作为范围。
- 语义转义使用中文标签。
- 返回 `{ items, negated }`。

- [ ] **Step 6: 运行测试并提交**

Run:

```powershell
node tests\regex-display-model.test.cjs
node tests\regex-visualizer.test.cjs
git diff --check
```

Expected: 两项 PASS。

```powershell
git add regex-display-model.js tests/regex-display-model.test.cjs
git commit -m "完善正则转义与字符集合展示"
```

### Task 3: 让流程图消费 Display AST

**Files:**
- Modify: `regex-flow-layout.js`
- Modify: `tests/regex-flow-layout.test.cjs`

- [ ] **Step 1: 增加布局失败测试**

```js
const { createRegexDisplayModel } = require('../regex-display-model.js');

function flow(pattern) {
    return layoutRegexFlow(
        createRegexDisplayModel(parseRegexVisualization(pattern).ast)
    );
}

const url = flow('http:\\/\\/');
assert.equal(url.nodes.some(node => node.label === 'http://'), true);
assert.equal(url.nodes.filter(node => node.kind === 'literal').length, 1);

const characterFlow = flow('[a-zA-Z0-9-]');
const classNode = characterFlow.nodes.find(node => node.kind === 'character');
assert.deepEqual(classNode.lines, ['a-z', 'A-Z', '0-9', '-']);
assert.ok(classNode.height > 40);
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node tests\regex-flow-layout.test.cjs`

Expected: FAIL 于 `http://` 或 `lines`。

- [ ] **Step 3: 修改节点标签和尺寸**

布局节点优先使用：

```js
const label = node.displayText || node.raw || '空';
const lines = node.characterItems?.length ? node.characterItems : [label];
```

节点高度：

```js
const lineHeight = 22;
const height = Math.max(
    options.nodeHeight,
    lines.length * lineHeight + 16
);
```

节点结果增加 `lines`。宽度按最长行计算。

- [ ] **Step 4: 验证路径基线和分组尺寸**

新增断言：

- 多行字符集合前后主路径保持同一基线。
- 分组高度包含完整字符集合节点。
- 量词标签位于多行节点下方。

- [ ] **Step 5: 运行测试并提交**

Run:

```powershell
node tests\regex-display-model.test.cjs
node tests\regex-flow-layout.test.cjs
git diff --check
```

Expected: 全部 PASS。

```powershell
git add regex-flow-layout.js tests/regex-flow-layout.test.cjs
git commit -m "支持流程图合并字符与多行集合"
```

### Task 4: 四种视图统一接入 Display AST

**Files:**
- Modify: `regex-tester.html`
- Modify: `tests/regex-tester.test.cjs`

- [ ] **Step 1: 增加模块接线失败测试**

```js
assert.match(page, /<script src="regex-display-model\.js"><\/script>/);
assert.match(page, /RegexDisplayModel\.createRegexDisplayModel\(result\.ast\)/);
assert.match(page, /renderRailroadView\(displayAst\)/);
assert.match(page, /renderFlowDiagramView\(displayAst\)/);
assert.match(page, /renderSyntaxTree\(displayAst\)/);
assert.match(page, /renderExplanationTable\(displayAst\)/);
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node tests\regex-tester.test.cjs`

Expected: FAIL，缺少 Display Model 脚本。

- [ ] **Step 3: 加载模块并统一生成 Display AST**

脚本顺序：

```html
<script src="regex-visualizer.js"></script>
<script src="regex-display-model.js"></script>
<script src="regex-flow-layout.js"></script>
```

统一入口：

```js
function renderVisualization(result, isStale = false) {
    const displayAst = RegexDisplayModel.createRegexDisplayModel(result.ast);
    renderRailroadView(displayAst);
    renderFlowDiagramView(displayAst);
    renderSyntaxTree(displayAst);
    renderExplanationTable(displayAst);
    // stale note...
}
```

- [ ] **Step 4: 修改匹配路径图**

- `literalRun` 使用 `displayText`。
- 语义转义使用 `displayText`。
- 字符集合使用纵向 `.railroad-character-items`。
- `title` 内容包含 `原始片段：${node.raw}` 与说明。

- [ ] **Step 5: 修改 SVG 输出**

`renderFlowNode` 使用 `node.lines`：

```js
<text>
  ${node.lines.map((line, index) =>
      `<tspan x="..." dy="${index ? 22 : startDy}">${escapeHtml(line)}</tspan>`
  ).join('')}
</text>
```

`<title>` 继续显示 `node.raw`。

- [ ] **Step 6: 修改语法树**

- summary 主文字显示 `displayText`。
- 原始片段与主文字不同时额外显示 `<code>原始：...</code>`。
- 字符集合下显示 `<ul class="character-item-list">`。

- [ ] **Step 7: 修改分段说明**

- 片段列显示 `raw`。
- 含义列显示 `displayText`。
- 字符集合项目用 `<span class="character-item">` 纵向排列。
- 否定集合显示“排除以下字符”。

- [ ] **Step 8: 增加安全输出测试**

页面测试验证：

- `displayText` 与 `characterItems` 经 `escapeHtml`。
- SVG 使用 `<tspan>`。
- 原始片段仍进入转义后的 `title`。

- [ ] **Step 9: 运行测试并提交**

Run:

```powershell
node tests\regex-display-model.test.cjs
node tests\regex-flow-layout.test.cjs
node tests\regex-tester.test.cjs
node tests\regex-visualizer.test.cjs
git diff --check
```

Expected: 全部 PASS。

```powershell
git add regex-tester.html tests/regex-tester.test.cjs regex-display-model.js
git commit -m "统一四种正则视图展示模型"
```

### Task 5: 更新版本并完成浏览器验收

**Files:**
- Modify: `regex-tester.html`
- Modify: `tests/regex-tester.test.cjs`

- [ ] **Step 1: 增加版本失败测试**

```js
assert.match(page, /<span>V1\.07<\/span>/);
assert.match(page, /<div class="changelog-version">V1\.07<\/div>/);
assert.match(page, /优化四种正则可视化视图，支持连续字符合并、字面转义解码和字符集合纵向拆分。/);
assert.equal(
    (page.match(/<div class="changelog-date">2026年6月19日<\/div>/g) || []).length,
    1
);
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node tests\regex-tester.test.cjs`

Expected: FAIL，当前版本为 V1.06。

- [ ] **Step 3: 更新版本说明**

将页头改为 `V1.07`，在现有 2026年6月19日日期组内将 V1.07 放在 V1.06 前。

- [ ] **Step 4: 运行全部自动测试**

Run:

```powershell
node tests\regex-display-model.test.cjs
node tests\regex-flow-layout.test.cjs
node tests\regex-visualizer.test.cjs
node tests\regex-tester.test.cjs
node tests\json-parser-hang.test.cjs
node tests\text-case-converter.test.cjs
node tests\text-escape-formatter.test.cjs
node --check regex-display-model.js
git diff --check
```

Expected: 全部 PASS。

- [ ] **Step 5: 浏览器验收**

使用用户提供的 URL 正则验证四种视图：

1. `http`、`localhost` 为整体节点。
2. `\/\/` 显示为 `//`，`\.` 显示为 `.`。
3. `[a-zA-Z0-9-]` 纵向显示 `a-z/A-Z/0-9/-`。
4. 原始片段仍能通过悬停说明查看。
5. 四个视图显示规则一致。
6. 字符集合节点高度变化后，连线、量词和分组框不重叠。
7. 390px 和 1280px 下滚动正常。
8. 控制台无错误。

- [ ] **Step 6: 提交最终版本**

```powershell
git add regex-display-model.js regex-flow-layout.js regex-tester.html tests
git commit -m "完成正则可视化展示优化"
```
