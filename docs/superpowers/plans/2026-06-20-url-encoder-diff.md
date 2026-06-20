# URL 编解码差异对比 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 URL 编解码工具增加自动字符差异对比与输入输出交换功能。

**Architecture:** 在现有单页中加入最长公共子序列差异计算纯函数，输入输出采用左右双栏，并通过叠加在原生文本框内的高亮层安全展示差异。编码、解码、交换和清空操作统一调用差异刷新逻辑。

**Tech Stack:** HTML、CSS、Vanilla JavaScript、Node.js `node:test`

---

### Task 1: 差异算法与页面结构

**Files:**
- Modify: `url-encoder.html`
- Create: `tests/url-encoder.test.cjs`

- [ ] **Step 1: Write the failing test**

测试页面存在交换按钮和差异容器，并验证 `buildDiffSegments` 能识别相同、新增、删除和替换字符。

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/url-encoder.test.cjs`

Expected: FAIL，因为页面尚无差异函数和交换按钮。

- [ ] **Step 3: Write minimal implementation**

在页面中增加差异样式、差异区域、`buildDiffSegments`、`renderDiff` 和 `swapInputOutput`。

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/url-encoder.test.cjs`

Expected: PASS。

### Task 2: 回归验证

**Files:**
- Verify: `tests/*.test.cjs`

- [ ] **Step 1: Run all tests**

Run: `Get-ChildItem tests -Filter *.test.cjs | ForEach-Object { node --test $_.FullName }`

Expected: 所有测试通过。

- [ ] **Step 2: Check whitespace errors**

Run: `git diff --check`

Expected: 无输出。
