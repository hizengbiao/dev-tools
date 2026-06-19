# 正则流程图视图 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在正则可视化弹窗中新增 Regulex 布局语义、工具箱统一配色的“正则流程图”第四视图。

**Architecture:** 新建纯 JavaScript UMD 模块 `regex-flow-layout.js`，把现有正则 AST 转换为节点、路径和分组框布局数据。`regex-tester.html` 只负责将布局数据安全渲染为 SVG，并复用现有页签、实时刷新和错误保留机制。

**Tech Stack:** 原生 JavaScript、SVG、HTML/CSS、Node.js `assert`

---

## 文件结构

- Create: `regex-flow-layout.js`：纯布局算法、尺寸保护和绘图数据结构。
- Create: `tests/regex-flow-layout.test.cjs`：验证顺序、分支、量词、嵌套分组和复杂度保护。
- Modify: `regex-tester.html`：第四页签、SVG 渲染器、样式、刷新接线和版本说明。
- Modify: `tests/regex-tester.test.cjs`：页面结构、ARIA、SVG 安全输出和版本测试。

### Task 1: 建立流程图布局数据契约

**Files:**
- Create: `regex-flow-layout.js`
- Create: `tests/regex-flow-layout.test.cjs`

- [ ] **Step 1: 编写失败测试**

```js
const assert = require('node:assert/strict');
const { parseRegexVisualization } = require('../regex-visualizer.js');
const { layoutRegexFlow } = require('../regex-flow-layout.js');

const parsed = parseRegexVisualization('^ab$');
const layout = layoutRegexFlow(parsed.ast);

assert.equal(layout.ok, true);
assert.ok(layout.width > 0);
assert.ok(layout.height > 0);
assert.equal(layout.nodes.some(node => node.kind === 'start'), true);
assert.equal(layout.nodes.some(node => node.kind === 'end'), true);
assert.deepEqual(
    layout.nodes.filter(node => node.kind === 'literal').map(node => node.raw),
    ['a', 'b']
);
assert.ok(layout.paths.length >= 3);
```

- [ ] **Step 2: 运行测试确认模块缺失**

Run: `node tests\regex-flow-layout.test.cjs`

Expected: FAIL，提示找不到 `regex-flow-layout.js`。

- [ ] **Step 3: 实现 UMD 接口和基础顺序布局**

公开接口：

```js
{
    DEFAULT_FLOW_OPTIONS,
    layoutRegexFlow(ast, options)
}
```

默认配置：

```js
const DEFAULT_FLOW_OPTIONS = Object.freeze({
    nodeHeight: 40,
    nodeGap: 32,
    branchGap: 36,
    groupPadding: 24,
    canvasPadding: 30,
    maxWidth: 24000,
    maxHeight: 16000,
    maxItems: 5000
});
```

成功结果：

```js
{
    ok: true,
    width,
    height,
    nodes: [{ id, kind, raw, label, description, x, y, width, height, quantifier }],
    paths: [{ id, kind, d }],
    groups: [{ id, kind, title, x, y, width, height }]
}
```

基础实现为字面量、锚点、字符类和转义节点计算固定高度与文字估算宽度；表达式和顺序节点按水平方向组合。最后添加开始、结束节点和主连接线。

- [ ] **Step 4: 运行测试确认通过**

Run: `node tests\regex-flow-layout.test.cjs`

Expected: 输出 `regex flow layout passed`。

- [ ] **Step 5: 提交**

```powershell
git add regex-flow-layout.js tests/regex-flow-layout.test.cjs
git commit -m "新增正则流程图基础布局"
```

### Task 2: 支持分支、量词和分组布局

**Files:**
- Modify: `regex-flow-layout.js`
- Modify: `tests/regex-flow-layout.test.cjs`

- [ ] **Step 1: 增加分支失败测试**

```js
const branchAst = parseRegexVisualization('a|bc').ast;
const branchLayout = layoutRegexFlow(branchAst);
assert.equal(branchLayout.ok, true);
assert.ok(branchLayout.paths.some(path => path.kind === 'branch'));
assert.ok(branchLayout.height > layoutRegexFlow(parseRegexVisualization('abc').ast).height);
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node tests\regex-flow-layout.test.cjs`

Expected: FAIL，缺少 `branch` 路径。

- [ ] **Step 3: 实现分支布局**

`alternation` 节点：

- 分别布局所有分支。
- 使用最大分支宽度作为共同内容宽度。
- 分支在垂直方向居中排列。
- 添加入口分叉与出口汇合的三次贝塞尔路径。
- 返回统一入口与出口坐标。

- [ ] **Step 4: 增加量词失败测试**

```js
const optional = layoutRegexFlow(parseRegexVisualization('a?').ast);
assert.ok(optional.paths.some(path => path.kind === 'bypass'));

const repeated = layoutRegexFlow(parseRegexVisualization('a+').ast);
assert.ok(repeated.paths.some(path => path.kind === 'repeat'));
assert.equal(repeated.labels.some(label => /至少 1 次/.test(label.text)), true);

const lazy = layoutRegexFlow(parseRegexVisualization('a{2,4}?').ast);
assert.equal(lazy.labels.some(label => /优先少匹配/.test(label.text)), true);
```

- [ ] **Step 5: 实现量词连线和说明**

布局结果增加：

```js
labels: [{ id, kind: 'quantifier', text, x, y }]
```

规则：

- `min === 0` 添加上方 `bypass` 路径。
- `max > 1` 或 `max === Infinity` 添加下方 `repeat` 路径。
- `{n}` 仅添加次数文本，不画回环。
- 懒惰量词文本追加“优先少匹配”。

- [ ] **Step 6: 增加分组和嵌套失败测试**

```js
const grouped = layoutRegexFlow(
    parseRegexVisualization('(?<area>(ab|cd)+)').ast
);
assert.equal(grouped.groups.some(group => group.title === '命名分组 area'), true);
assert.equal(grouped.groups.some(group => group.kind === 'captureGroup'), true);
assert.ok(grouped.groups.length >= 2);
```

- [ ] **Step 7: 实现分组边框**

捕获组、非捕获组和断言先布局内部内容，再按 `groupPadding` 扩展尺寸，记录对应虚线边框和标题。嵌套组的边框坐标随外层组合整体平移。

- [ ] **Step 8: 实现空表达式和尺寸保护测试**

```js
const empty = layoutRegexFlow(parseRegexVisualization('').ast);
assert.equal(empty.nodes.filter(node => ['start', 'end'].includes(node.kind)).length, 2);

const tooWide = layoutRegexFlow(parseRegexVisualization('a'.repeat(200)).ast, {
    maxWidth: 300
});
assert.equal(tooWide.ok, false);
assert.equal(tooWide.error.code, 'FLOW_TOO_LARGE');
```

- [ ] **Step 9: 运行测试并提交**

Run:

```powershell
node tests\regex-flow-layout.test.cjs
node tests\regex-visualizer.test.cjs
git diff --check
```

Expected: 两项测试 PASS。

```powershell
git add regex-flow-layout.js tests/regex-flow-layout.test.cjs
git commit -m "完善正则流程图分支与循环布局"
```

### Task 3: 接入第四页签和 SVG 渲染

**Files:**
- Modify: `regex-tester.html`
- Modify: `tests/regex-tester.test.cjs`

- [ ] **Step 1: 编写页面接线失败测试**

```js
assert.match(page, /<script src="regex-flow-layout\.js"><\/script>/);
assert.match(page, /id="flowDiagramTab"[^>]*data-view="flowDiagram"[^>]*>正则流程图<\/button>/);
assert.match(page, /id="flowDiagramView"[^>]*aria-labelledby="flowDiagramTab"[^>]*hidden/);
assert.match(page, /flowDiagram:\s*flowDiagramView/);
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node tests\regex-tester.test.cjs`

Expected: FAIL 于缺少 `flowDiagramTab`。

- [ ] **Step 3: 增加脚本、页签和面板**

脚本顺序：

```html
<script src="regex-visualizer.js"></script>
<script src="regex-flow-layout.js"></script>
<script>
```

页签顺序为匹配路径图、正则流程图、语法树、分段说明。新页签初始 `aria-selected="false"`、`tabindex="-1"`；面板初始 `hidden`。

- [ ] **Step 4: 增加 SVG 渲染失败测试**

```js
assert.match(page, /function renderFlowDiagramView\(ast\)/);
assert.match(page, /RegexFlowLayout\.layoutRegexFlow\(ast\)/);
assert.match(page, /function renderFlowSvg\(layout\)/);
assert.match(page, /<svg class="regex-flow-svg"/);
assert.match(page, /escapeHtml\(node\.raw/);
assert.match(page, /renderFlowDiagramView\(result\.ast\)/);
```

- [ ] **Step 5: 实现安全 SVG 输出**

实现：

```js
function renderFlowDiagramView(ast) {
    const layout = RegexFlowLayout.layoutRegexFlow(ast);
    if (!layout.ok) {
        flowDiagramView.innerHTML =
            `<div class="visualizer-empty">${escapeHtml(layout.error.message)}</div>`;
        return;
    }
    flowDiagramView.innerHTML = renderFlowSvg(layout);
}
```

`renderFlowSvg(layout)` 输出顺序：

1. 分组边框
2. 主路径、分支、绕过和回环路径
3. 节点
4. 量词标签

所有 `raw`、`label`、`description`、`title` 和标签文本必须使用 `escapeHtml`。

- [ ] **Step 6: 增加工具箱统一样式**

CSS 类：

```css
.regex-flow-svg
.flow-path-main
.flow-path-branch
.flow-path-repeat
.flow-path-bypass
.flow-node-literal
.flow-node-character
.flow-node-anchor
.flow-node-reference
.flow-group-capture
.flow-group-assertion
.flow-quantifier-label
```

SVG 保持自然宽高，面板负责双向滚动。节点最小字号为 13px，小屏不缩放文字。

- [ ] **Step 7: 接入统一刷新和旧结果提示**

`renderVisualization(result, isStale)` 同时调用四个视图渲染函数。旧结果提示也插入 `flowDiagramView`。

- [ ] **Step 8: 运行测试并提交**

Run:

```powershell
node tests\regex-flow-layout.test.cjs
node tests\regex-tester.test.cjs
node tests\regex-visualizer.test.cjs
git diff --check
```

Expected: 全部 PASS。

```powershell
git add regex-tester.html tests/regex-tester.test.cjs
git commit -m "接入正则流程图第四视图"
```

### Task 4: 更新版本和完成验收

**Files:**
- Modify: `regex-tester.html`
- Modify: `tests/regex-tester.test.cjs`

- [ ] **Step 1: 增加版本失败测试**

```js
assert.match(page, /<span>V1\.06<\/span>/);
assert.match(page, /<div class="changelog-version">V1\.06<\/div>/);
assert.match(page, /新增 Regulex 风格的正则流程图，通过连线、分支、循环和分组框展示正则匹配结构。/);
assert.equal(
    (page.match(/<div class="changelog-date">2026年6月19日<\/div>/g) || []).length,
    1
);
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node tests\regex-tester.test.cjs`

Expected: FAIL，当前版本为 V1.05。

- [ ] **Step 3: 更新版本说明**

页头更新为 `V1.06`。在现有 `2026年6月19日` 日期组内，把 V1.06 条目放在 V1.05 之前，不新增重复日期标题。

- [ ] **Step 4: 运行全部自动测试**

Run:

```powershell
node tests\regex-flow-layout.test.cjs
node tests\regex-visualizer.test.cjs
node tests\regex-tester.test.cjs
node tests\json-parser-hang.test.cjs
node tests\text-case-converter.test.cjs
node tests\text-escape-formatter.test.cjs
git diff --check
```

Expected: 全部 PASS。

- [ ] **Step 5: 浏览器验收**

使用本地静态服务验证：

1. 默认手机号正则显示开始/结束、两个分组、数字节点和次数说明。
2. `^(a|b)*?$` 显示上下分支、绕过路径、回环和“优先少匹配”。
3. URL 示例显示嵌套分组、多个分支和双向滚动。
4. 四个页签点击和方向键切换正常。
5. 输入变化约 250 毫秒后流程图更新。
6. 无效规则时保留上次成功流程图并显示错误。
7. 节点悬停可见原始片段和说明。
8. 390px 与 1280px 下不裁切，控制台无错误。

- [ ] **Step 6: 提交最终版本**

```powershell
git add regex-tester.html tests/regex-tester.test.cjs regex-flow-layout.js tests/regex-flow-layout.test.cjs
git commit -m "完成 Regulex 风格正则流程图"
```
