# 项目开发手册 & 需求功能清单 (Development Handbook)

这份文档旨在帮助开发者快速理解项目背景、掌握已开发功能，并遵循统一的开发规范进行新功能的扩展。**后续所有新功能的开发，都必须严格遵守本开发规范。**

## 1. 项目背景
本项目是一个**开发者工具箱 (Developer Tools)**，旨在提供一系列纯前端、轻量级、无需后端依赖的实用工具。项目托管于 GitHub，并通过 **GitHub Pages** 进行在线部署。

- **在线地址**: [GitHub Pages URL] (例如: https://hizengbiao.github.io/dev-tools/)
- **核心理念**: 简单、好用、美观、纯静态。

## 2. 已实现功能清单 (Current Features)
截止当前版本，已集成以下工具：

| 工具名称 | 路径 (Path) | 描述 | 技术栈 |
| :--- | :--- | :--- | :--- |
| **首页** | `index.html` | 工具箱入口，展示所有工具卡片。 | HTML/CSS |
| **JSON 格式化** | `json-parser.html` | 支持格式化、压缩、修复、排序、折叠/展开。 | Vanilla JS |
| **时间戳转换** | `timestamp-converter.html` | 时间戳与日期互转，支持动态时钟。 | Vanilla JS |
| **URL 编解码** | `url-encoder.html` | URL Encode/Decode、输入输出差异对比和 URL 参数分析。 | Vanilla JS |
| **Base64 编解码** | `base64-encoder.html` | 文本与文件的 Base64 转换。 | Vanilla JS |
| **哈希/摘要工具** | `hash-generator.html` | 文本与文件摘要计算，支持 MD5、SHA-1、SHA-256、SHA-512 和摘要比对。 | Vanilla JS |
| **JWT 解析工具** | `jwt-decoder.html` | 本地解析 JWT Header、Payload 和时间字段，不做签名可信校验。 | Vanilla JS |
| **UUID / 随机值生成器** | `random-generator.html` | 生成 UUID v4、随机密码和随机数字，支持批量复制。 | Vanilla JS |
| **Cron 表达式解析与生成工具** | `cron-parser.html` | 解析并说明 Linux、Spring 和 Quartz Cron，也可按结构化执行需求生成多种格式。 | Vanilla JS |
| **SQL 格式化/压缩工具** | `sql-formatter.html` | 格式化、压缩常见 SQL，并提取表名和参数占位符。 | Vanilla JS |
| **命名转换** | `text-case-converter.html` | 大小写、蛇形、驼峰、短横线等变量命名格式互转。 | Vanilla JS |
| **文本转义转换工具** | `text_escape_formatter_final.html` | 转义文本与可读文本互转、拼接字符串合并和输入输出差异对比。 | Vanilla JS |
| **文本智能拆分** | `text-splitter.html` | 按指定长度智能拆分文本，优先保留自然边界并支持逐段复制。 | Vanilla JS |
| **正则表达式测试** | `regex-tester.html` | 正则匹配、替换、分组高亮和可视化。 | Vanilla JS |
| **HTML 元素格式化** | `html-formatter.html` | 格式化、压缩或修复 HTML 文档与元素片段，支持层级展开收起、悬停深度反馈、标签配对提示和结构检查。 | Vanilla JS |
| **Neon Timer** | `neon-timer/dist/index.html` | 霓虹风格倒计时/秒表 (独立 App)。 | React + Vite |

**公共组件：**
- **公共导航栏**: 由 `nav.js` 和 `nav.css` 统一管理，所有子页面均需引入。

## 3. 开发规范 (Development Rules)

### 3.1 技术选型
1.  **简单工具**: 优先使用 **原生 HTML / CSS / JavaScript**。无需构建步骤，直接修改 HTML 即可生效。
2.  **复杂工具**: 如需复杂状态管理（如 Neon Timer），可使用 React/Vue 等框架，但**必须**能够编译为静态文件（如通过 Vite 构建到 `dist`），并确保支持 `file://` 协议预览。
3.  **样式风格**: 保持深色系/极简风格，尽量复用现有 CSS 变量（参考 `nav.css` 或现有页面）。

### 3.2 新功能开发流程 (Standard Workflow)
每当开发一个新的工具子页面（例如 `regex-tester.html`）时，**必须**执行以下步骤：

#### 步骤 1: 创建工具页面
- 在根目录下创建新的 HTML 文件。
- **关键**: 在 `<head>` 中引入公共导航：
  ```html
  <link rel="stylesheet" href="nav.css">
  <script src="nav.js" defer></script>
  ```
- **注意**: 如果工具在子目录下（如 `tools/new-tool/index.html`），需使用相对路径引入（如 `../../nav.css`）。`nav.js` 会自动处理导航链接的路径问题。

#### 步骤 2: 注册导航菜单
- 打开 `nav.js`。
- 在 `tools` 数组中添加新工具的配置：
  ```javascript
  { name: '新工具名称', path: 'new-tool.html', icon: '🔧' }
  ```
- 这一步会自动更新**所有**页面的顶部导航栏，无需逐个修改。

#### 步骤 3: 更新首页入口
- 打开 `index.html`。
- 在 `.tools-grid` 容器中添加一个新的卡片 (`a.tool-card`)：
  ```html
  <a href="new-tool.html" class="tool-card">
      <span class="tool-icon">🔧</span>
      <h2>新工具名称</h2>
      <p>简短的工具描述...</p>
  </a>
  ```

#### 步骤 4: 更新文档
- 将新功能添加到本文件 (`DEVELOPMENT.md`) 的“已实现功能清单”中。
- 更新 `README.md` 的功能列表。

### 3.3 部署规范
- 本项目部署在 **GitHub Pages**。
- 所有资源路径必须是**相对路径** (`./` 或 `../`)，严禁使用绝对路径 (`/css/style.css`)，以防止在子目录部署时 404。
- 对于 React/Vue 项目，构建时需设置 Base URL 为相对路径 (`base: './'`)。

---

> **给 AI 助手的提示**: 读取此文档时，请检查当前请求是否涉及新功能开发。如果是，请务必检查是否完成了上述“新功能开发流程”的所有 4 个步骤。
