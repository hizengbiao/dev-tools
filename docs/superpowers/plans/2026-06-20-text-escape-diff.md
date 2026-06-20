# Text Escape Diff Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add automatic inline input/output diff highlighting to the text escape formatter.

**Architecture:** Extend each existing editor shell with a synchronized highlight layer behind its textarea. Reuse a bounded character diff algorithm and call rendering from the existing stats refresh path so every conversion and edit updates consistently.

**Tech Stack:** HTML, CSS, browser JavaScript, Node.js assertion tests.

---

### Task 1: Add regression coverage

**Files:**
- Modify: `tests/text-escape-formatter.test.cjs`

- [x] Assert the V1.05 changelog, highlight layer structure, diff functions, and absence of deletion strikethrough.
- [x] Assert character diff output and scroll synchronization.
- [x] Run `node tests/text-escape-formatter.test.cjs` and confirm it fails because the feature is missing.

### Task 2: Implement inline diff rendering

**Files:**
- Modify: `text_escape_formatter_final.html`

- [x] Add editor stages and input/output highlight layers.
- [x] Add bounded diff calculation, rendering, summary, and synchronized scrolling.
- [x] Route existing refresh behavior through diff rendering.
- [x] Update the page and changelog to V1.05.

### Task 3: Verify and publish

**Files:**
- Verify: `tests/*.test.cjs`

- [x] Run the text escape formatter test and the complete test suite.
- [x] Run `git diff --check`.
- [x] Verify the page in the local browser.
- [x] Prepare the verified changes for a Chinese commit and push to `main`.
