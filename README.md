# 开发者工具箱 (Developer Tools)

一系列实用的纯前端开发小工具合集。

- **GitHub 仓库**: https://github.com/hizengbiao/dev-tools
- **在线访问**: https://hizengbiao.github.io/dev-tools/

## 🛠️ 可用工具 (Tools)

| 工具 | 描述 |
| :--- | :--- |
| [首页](index.html) | 工具箱入口页，集中展示所有可用工具。 |
| [JSON 格式化工具](json-parser.html) | 支持格式化、压缩、修复、排序、折叠/展开。 |
| [时间戳转换](timestamp-converter.html) | Unix 时间戳与日期在线互转，支持动态时钟。 |
| [URL 编解码](url-encoder.html) | URL Encode/Decode、输入输出差异对比和 URL 参数分析。 |
| [Base64 编解码](base64-encoder.html) | 支持文本和文件的 Base64 互相转换。 |
| [哈希/摘要工具](hash-generator.html) | 计算文本和文件的 MD5、SHA-1、SHA-256、SHA-512 摘要，并支持摘要比对。 |
| [JWT 解析工具](jwt-decoder.html) | 本地解析 JWT Header、Payload 和时间字段，明确不做签名可信校验。 |
| [UUID / 随机值生成器](random-generator.html) | 生成 UUID v4、随机密码和随机数字，支持批量复制。 |
| [Cron 表达式解析与生成工具](cron-parser.html) | 解析并说明 Linux、Spring 和 Quartz Cron，也可按执行需求逆向生成多种格式。 |
| [SQL 格式化/压缩工具](sql-formatter.html) | 格式化、压缩常见 SQL，并提取表名和参数占位符。 |
| [命名转换](text-case-converter.html) | 支持变量名大小写、蛇形、驼峰、短横线等格式互转。 |
| [文本转义转换工具](text_escape_formatter_final.html) | 支持转义文本、可读文本、拼接字符串合并和输入输出差异对比。 |
| [文本智能拆分](text-splitter.html) | 按指定长度智能拆分长文本，优先保留自然语义边界并支持逐段复制。 |
| [正则表达式测试](regex-tester.html) | 支持正则匹配、替换、分组高亮和正则表达式可视化。 |
| [HTML 元素格式化](html-formatter.html) | 格式化、压缩或修复 HTML 文档与元素片段，支持层级展开收起、深度背景、结构检查和撤销重做。 |
| [Neon Timer](neon-timer/dist/index.html) | 炫酷霓虹风格的倒计时与秒表应用。 |

## 📖 开发指南 (Development Guide)

为了保证项目的可维护性，我们制定了详细的开发规范。

> **详细的开发规范、新功能添加流程，请参阅 [开发手册 (DEVELOPMENT.md)](DEVELOPMENT.md)**。

如果您是 AI 助手或新加入的开发者，请**务必先阅读开发手册**，并严格遵守其中的流程（如：必须注册公共导航、必须更新文档等）。

## 部署到 GitHub Pages

只需将代码推送到 `main` 分支，并在仓库设置中启用 GitHub Pages (Source: `/ (root)`) 即可。
