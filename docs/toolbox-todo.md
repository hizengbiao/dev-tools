# 工具箱功能优化 TODO

> 维护规则：后续每次按本清单实现一小项，完成后将对应条目从 `[ ]` 改为 `[x]`，补充 `完成记录`，并在需要时追加新识别的候选项。

## 状态说明

- `[ ]` 未开始
- `[~]` 进行中，提交前应恢复为 `[ ]` 或 `[x]`
- `[x]` 已完成

## 优先级说明

- `P0`：基础设施或高频痛点，优先处理
- `P1`：明确提升效率的工具功能
- `P2`：有价值但可排在后面的增强
- `P3`：候选想法，先记录，后续再确认投入

## 执行约定

- 每次完成一个TODO任务。
- 不要修改的太细了，不要拆分的太细了
- 涉及页面功能时，同步更新版本更新说明，并确保日期使用实际提交日期。
- 涉及新增工具时，同步更新 `nav.js`、`index.html`、`README.md`、`DEVELOPMENT.md` 和测试。
- 涉及核心转换逻辑时，优先补 `tests/*.test.cjs` 覆盖典型样例和边界样例。
- 修改完成后运行相关测试和 `git diff --check`，再提交并推送。

## 近期推荐顺序

1. [x] `TODO-CORE-001` 增加版本更新说明日期校验测试
2. [x] `TODO-TIME-001` 补齐时间戳工具批量转换
3. [x] `TODO-URL-001` 将 URL 编解码扩展为 URL 参数分析器
4. [x] `TODO-CORE-002` 增加导航、首页、README 工具入口一致性校验
5. [x] `TODO-REGEX-001` 增加常用正则模板库
6. [x] `TODO-REGEX-002` 增加正则性能风险提示
7. [x] `TODO-REGEX-003` 增加匹配结果导出
8. [x] `TODO-REGEX-004` 增加替换分组辅助面板

## 公共基础设施

### TODO-CORE-001：版本更新说明日期校验

- 状态：`[x]`
- 优先级：`P0`
- 类型：测试 / 质量保障
- 目标：扫描所有带版本更新说明的工具页面，检查顶部版本号对应的 changelog 条目位于实际提交日期或指定当前日期分组下，避免新版本被放到旧日期下面。
- 建议涉及文件：`tests/changelog-date.test.cjs`，各工具 HTML。
- 验收标准：
  - 能识别每个页面顶部 `Vx.xx`。
  - 能确认 changelog 中存在同版本条目。
  - 能确认该版本条目属于正确日期分组。
  - 日期错误时测试失败并输出页面名和版本号。
- 完成记录：2026-06-26 已新增 `tests/changelog-date.test.cjs`，校验每个工具页面顶部版本号必须存在对应 changelog 条目，且该版本引入提交日期必须与 changelog 日期分组一致；已通过 `node tests\changelog-date.test.cjs`。

### TODO-CORE-002：导航、首页、README 工具入口一致性校验

- 状态：`[x]`
- 优先级：`P0`
- 类型：测试 / 文档一致性
- 目标：校验 `nav.js`、`index.html`、`README.md`、`DEVELOPMENT.md` 中的工具入口一致，避免新增工具后遗漏入口或文档。
- 建议涉及文件：`tests/tool-registry.test.cjs`。
- 验收标准：
  - `nav.js` 中的每个工具都能在首页找到入口。
  - `README.md` 和 `DEVELOPMENT.md` 都包含工具路径。
  - 测试输出遗漏位置。
- 完成记录：2026-06-26 已新增 `tests/tool-registry.test.cjs`，校验 `nav.js`、`index.html`、`README.md`、`DEVELOPMENT.md` 的工具入口一致性；已补齐 README 和开发手册中缺失的工具入口，并通过 `node tests\tool-registry.test.cjs`。

### TODO-CORE-003：抽取版本弹窗公共模块

- 状态：`[x]`
- 优先级：`P1`
- 类型：重构 / 可维护性
- 目标：将各页面重复的版本按钮、弹窗打开关闭、点击遮罩关闭逻辑抽为公共模块。
- 建议涉及文件：新增 `changelog.js` 或类似公共脚本，更新各工具页面。
- 验收标准：
  - 所有工具仍能打开版本更新说明。
  - 弹窗标题统一为 `🚀 版本更新说明`。
  - 相关页面测试通过。
- 完成记录：2026-06-27 已新增 `changelog.js` 公共模块，统一处理版本更新说明弹窗的打开、关闭和点击遮罩关闭逻辑；已接入所有带版本说明的工具页面，并新增 `tests/changelog-module.test.cjs` 覆盖公共模块接入。

### TODO-CORE-004：抽取行号编辑器公共能力

- 状态：`[x]`
- 优先级：`P1`
- 类型：重构 / 可维护性
- 目标：复用输入输出框行号、滚动同步、宽高布局逻辑，减少 URL、文本转义、文本拆分、正则测试中的重复实现。
- 建议涉及文件：新增 `editor-lines.js` 或类似公共脚本。
- 验收标准：
  - 现有支持行号的页面行为不变。
  - 粘贴大文本不会异常滚动。
  - 行号与内容滚动保持同步。
- 完成记录：2026-06-27 已新增 `editor-lines.js`，统一提供行号生成、行号刷新和滚动同步能力；已接入 URL 编解码、文本转义、正则测试、文本拆分页面，并新增 `tests/editor-lines.test.cjs` 覆盖公共能力。

### TODO-CORE-005：抽取差异对比公共能力

- 状态：`[x]`
- 优先级：`P1`
- 类型：重构 / 可维护性
- 目标：复用输入输出差异对比算法和高亮渲染逻辑，统一 URL 编解码、文本转义等页面表现。
- 建议涉及文件：新增 `diff-viewer.js` 或类似公共脚本。
- 验收标准：
  - 删除内容不使用删除线，仅使用背景标记。
  - 大文本差异有性能保护。
  - 现有差异相关测试通过。
- 完成记录：2026-06-27 已新增 `diff-viewer.js`，统一提供差异分段算法和差异节点创建能力；已接入 URL 编解码、文本转义页面，并新增 `tests/diff-viewer.test.cjs` 覆盖普通差异和大文本性能保护。

### TODO-CORE-006：抽取复制、Toast 公共能力

- 状态：`[x]`
- 优先级：`P2`
- 类型：重构 / 可维护性
- 目标：统一复制成功、复制失败、降级复制、Toast 展示方式。
- 建议涉及文件：新增 `clipboard-utils.js` 或类似公共脚本。
- 验收标准：
  - 各工具复制按钮反馈一致。
  - 浏览器不支持 Clipboard API 时仍可降级复制。
- 完成记录：2026-06-28 已新增 `clipboard-utils.js`，统一提供 Toast 展示、Clipboard API 复制和 textarea 降级复制能力；已接入所有带复制和 Toast 的工具页面，并新增 `tests/clipboard-utils.test.cjs` 覆盖公共能力和页面接入。

### TODO-CORE-007：拆分大型 HTML 内联脚本

- 状态：`[x]`
- 优先级：`P2`
- 类型：重构 / 可维护性
- 目标：逐步将 `json-parser.html`、`regex-tester.html`、`text_escape_formatter_final.html` 中的大段内联 JS 拆成模块，降低后续改动风险。
- 建议涉及文件：按工具新增独立 `.js` 文件，并补测试。
- 验收标准：
  - 拆分后页面功能不变。
  - 关键函数可在 Node 测试中直接导入或通过现有 harness 测试。
- 完成记录：待填写。
- 进展记录：
  - 2026-06-28 已将 `regex-tester.html` 中的常用正则模板抽取到 `regex-templates.js`，新增 `tests/regex-templates.test.cjs` 覆盖模板模块导出和页面接入。
  - 2026-06-28 已将 `json-parser.html` 中的 JSON 修复跳过判断抽取到 `json-repair-guards.js`，新增 `tests/json-repair-guards.test.cjs` 覆盖拼接字符串、正则片段和普通 JSON 判断。
  - 2026-06-28 已将 `text_escape_formatter_final.html` 中的转义转换、字符串拼接合并、变量映射恢复和加引号复制等纯逻辑抽取到 `text-escape-core.js`，新增 `tests/text-escape-core.test.cjs` 覆盖模块导出和页面接入。
  - 2026-06-28 已将 `json-parser.html` 中的 JSON/Java 互转纯逻辑抽取到 `json-java-converter.js`，新增 `tests/json-java-converter.test.cjs` 覆盖模块导出和页面接入。
  - 2026-06-28 已将 `json-parser.html` 中的 JSON key 递归排序逻辑抽取到 `json-sorter.js`，新增 `tests/json-sorter.test.cjs` 覆盖升序、降序、数组嵌套和页面接入。
  - 2026-06-28 已将 `regex-tester.html` 中的正则运行时工具逻辑抽取到 `regex-runtime-utils.js`，新增 `tests/regex-runtime-utils.test.cjs` 覆盖内联标志、转义标准化、行列定位和替换分组检查。
  - 2026-06-28 已将 `json-parser.html` 中的 JSON 路径写入和对象 key 重命名逻辑抽取到 `json-path-editor.js`，新增 `tests/json-path-editor.test.cjs` 覆盖嵌套写入、根节点替换和 key 顺序保持。
  - 2026-06-28 已将 `json-parser.html` 中的 JSON 节点路径解析和前缀判断逻辑抽取到 `json-dom-path-utils.js`，新增 `tests/json-dom-path-utils.test.cjs` 覆盖路径解析容错、前缀判断和页面集成。
  - 2026-06-28 已继续将 `json-parser.html` 中折叠子树用到的 DOM 相对层级计算和折叠图标定位逻辑收敛到 `json-dom-path-utils.js`，补充测试覆盖断链节点和首行图标查找。
  - 2026-06-29 已将 `json-parser.html` 中编辑器括号和引号匹配扫描逻辑抽取到 `json-bracket-matcher.js`，新增 `tests/json-bracket-matcher.test.cjs` 覆盖嵌套括号、字符串内括号跳过、转义引号和页面集成。
  - 2026-06-29 已继续将光标前后括号/引号匹配入口收敛到 `JsonBracketMatcher.findMatchingIndexAroundCursor`，页面只负责高亮匹配位置，减少 `json-parser.html` 内联分支逻辑。
  - 2026-06-29 已继续将括号高亮覆盖层的样式计算抽取到 `JsonBracketMatcher.calculateHighlightOverlayStyle`，减少 `json-parser.html` 中 DOM 高亮定位的内联计算。
  - 2026-06-29 已继续将括号位置测量用的镜像节点样式构造抽取到 `JsonBracketMatcher.buildTextMirrorStyle`，进一步压缩 `setupBracketMatching` 内联 DOM 样式代码。
  - 2026-06-29 已继续将括号位置测量中的文本前后切分抽取到 `JsonBracketMatcher.splitTextAroundIndex`，让 `getTextPosition` 只保留 DOM 测量职责。
  - 2026-06-29 已继续将括号位置测量中的 marker 相对坐标计算抽取到 `JsonBracketMatcher.calculateRelativeMarkerPosition`，减少 `getTextPosition` 中的手写矩形差值逻辑。
  - 2026-07-04 已将 `json-parser.html` 中从日志/赋值文本提取 JSON 值的纯逻辑抽取到 `json-assignment-extractor.js`，新增 `tests/json-assignment-extractor.test.cjs` 覆盖括号前缀日志、数组赋值、字符串内等号和不完整 JSON 边界。
  - 2026-07-04 已将 `json-parser.html` 中 Java toString / Map 风格对象规范化逻辑抽取到 `json-java-style-normalizer.js`，新增 `tests/json-java-style-normalizer.test.cjs` 覆盖类名前缀、裸字符串值、嵌套 Map、字符串内等号和页面接入。
  - 2026-07-05 已将 `json-parser.html` 中去注释、中文冒号修复、缺逗号补齐、未加引号 key/value 补齐逻辑抽取到 `json-repair-normalizer.js`，新增 `tests/json-repair-normalizer.test.cjs` 覆盖宽松 JSON 修复链路和页面接入。

## JSON 格式化工具

### TODO-JSON-001：JSON Path 查询

- 状态：`[x]`
- 优先级：`P1`
- 类型：功能增强
- 目标：支持输入类似 `$.data[0].name` 的路径，快速定位、展示并复制对应值。
- 建议合入：`json-parser.html`。
- 验收标准：
  - 支持对象属性、数组下标、嵌套路径。
  - 找不到路径时给出明确提示。
  - 查询结果可复制。
- 完成记录：2026-06-30 已在 `json-parser.html` 中新增 JSON Path 查询区，接入 `json-path-query.js`，支持对象属性、数组下标、嵌套路径和 bracket 字符串 key 查询；查询结果可复制，路径不存在或输入非法时给出明确提示；已更新 JSON 格式化工具版本至 V1.82。
- 进展记录：
  - 2026-06-30 已新增 `json-path-query.js` 和 `tests/json-path-query.test.cjs`，先补齐 JSON Path 解析与查询核心能力，支持对象属性、数组下标、嵌套路径和 bracket 字符串 key，并在路径不存在时返回明确提示。

### TODO-JSON-002：提取所有 Key 路径

- 状态：`[x]`
- 优先级：`P1`
- 类型：功能增强
- 目标：从 JSON 中提取所有字段路径，方便查看接口结构。
- 建议合入：`json-parser.html`。
- 验收标准：
  - 输出路径列表。
  - 可复制全部路径。
  - 数组字段路径表达方式稳定，例如 `items[].id`。
- 完成记录：2026-07-01 已在 `json-parser.html` 中接入字段路径提取区，支持从当前 JSON 或输入文本中提取字段路径、显示路径总数，并一键复制全部路径；数组字段路径稳定输出为 `items[].id`，数组原始值输出为 `tags[]`；已更新 JSON 格式化工具版本至 V1.83。
- 进展记录：
  - 2026-07-01 已新增 `json-key-paths.js` 和 `tests/json-key-paths.test.cjs`，先补齐字段路径提取核心能力，支持对象嵌套路径、数组字段 `items[].id` 稳定表达、数组原始值 `tags[]` 表达，以及包含特殊字符的 key bracket 表达。

### TODO-JSON-003：大 JSON 搜索结果面板

- 状态：`[x]`
- 优先级：`P1`
- 类型：交互增强
- 目标：搜索 key/value 后列出路径、行号、值预览，点击结果定位到源码或树节点。
- 建议合入：`json-parser.html`。
- 验收标准：
  - 支持 key 和 value 搜索。
  - 显示路径、行号、预览。
  - 大 JSON 搜索不卡死。
- 完成记录：2026-07-01 已在 `json-parser.html` 中新增 JSON 搜索结果面板，支持按 key/value 搜索，展示命中路径、格式化行号和值预览；点击结果可带入 JSON Path 查询定位；已更新 JSON 格式化工具版本至 V1.84。
- 进展记录：
  - 2026-07-01 已新增 `json-search-results.js` 和 `tests/json-search-results.test.cjs`，先补齐 JSON 搜索结果核心能力，支持 key/value 搜索、稳定路径输出、格式化 JSON 行号估算和值预览。

### TODO-JSON-004：字符串化 JSON 字段展开/收起

- 状态：`[x]`
- 优先级：`P2`
- 类型：功能增强
- 目标：对值本身是 JSON 字符串的字段支持一键展开为树状视图，并可恢复为原字符串。
- 建议合入：`json-parser.html`。
- 验收标准：
  - 能识别对象字符串和数组字符串。
  - 展开后保持原字段上下文。
  - 不误改普通字符串。
- 完成记录：2026-07-01 已在 `json-parser.html` 中支持就地展开/恢复 JSON 字符串字段：格式化结果中只有识别到对象/数组 JSON 文本的字段才显示“展开 JSON 字符串”，展开后的字段附近显示“恢复 JSON 字符串”；普通字符串不会被误改；已更新 JSON 格式化工具版本至 V1.86。
- 进展记录：
  - 2026-07-01 已新增 `json-string-fields.js` 和 `tests/json-string-fields.test.cjs`，先补齐字符串化 JSON 字段核心能力，支持识别对象/数组 JSON 字符串、展开为结构化值并记录路径，以及按路径恢复为原字符串。
  - 2026-07-01 已将顶部全局按钮调整为字段附近的就地按钮，并补充单字段路径展开/恢复测试。

## 正则表达式测试工具

### TODO-REGEX-001：常用正则模板库

- 状态：`[x]`
- 优先级：`P1`
- 类型：功能增强
- 目标：提供手机号、URL、JDBC、IP、邮箱、日志时间、异常堆栈等常用模板，一键填入测试内容和匹配规则。
- 建议合入：`regex-tester.html`。
- 验收标准：
  - 模板列表可选择。
  - 选择后自动填充示例文本、正则和推荐标志。
  - 不影响用户手动输入。
- 完成记录：2026-06-27 已在 `regex-tester.html` 中新增常用正则模板库，支持手机号、URL、JDBC、IPv4、邮箱、日志时间和异常堆栈模板，一键填入示例文本、匹配规则、替换文本和推荐标志；已更新 `tests/regex-tester.test.cjs`。

### TODO-REGEX-002：正则性能风险提示

- 状态：`[x]`
- 优先级：`P1`
- 类型：质量提示
- 目标：检测高风险回溯结构，例如嵌套重复 `(a+)+`、复杂重复分支等，并在测试前提示。
- 建议合入：`regex-tester.html`、`regex-visualizer.js` 或独立分析模块。
- 验收标准：
  - 能识别常见灾难性回溯风险。
  - 提示包含风险片段和简短原因。
  - 不阻止用户继续测试。
- 完成记录：2026-07-02 已新增 `regex-risk-analyzer.js` 和 `tests/regex-risk-analyzer.test.cjs`，支持识别嵌套量词 `(a+)+` 与重复分组内重叠分支 `(a|aa)+` 等常见灾难性回溯风险；已在 `regex-tester.html` 的匹配规则下方接入非阻断风险提示，提示包含风险片段和原因，并更新版本至 V1.10。

### TODO-REGEX-003：匹配结果导出

- 状态：`[x]`
- 优先级：`P1`
- 类型：功能增强
- 目标：支持将匹配结果复制或导出为 JSON、CSV、按分组列输出。
- 建议合入：`regex-tester.html`。
- 验收标准：
  - 导出内容包含匹配文本、起始位置、行列位置、分组。
  - CSV 正确处理逗号、换行和引号。
  - 空匹配结果有明确提示。
- 完成记录：2026-07-02 已新增 `regex-match-exporter.js` 和 `tests/regex-match-exporter.test.cjs`，支持将匹配结果导出为 JSON、CSV 和按分组展开的列式文本；已在 `regex-tester.html` 匹配结果区增加“复制JSON”“复制CSV”“复制分组列”按钮，导出内容包含匹配文本、起始位置、行列位置、捕获分组和命名分组，并更新版本至 V1.11。

### TODO-REGEX-004：替换分组辅助面板

- 状态：`[x]`
- 优先级：`P2`
- 类型：交互增强
- 目标：列出 `$1`、`$2` 等分组对应的含义和当前样例内容，辅助填写替换文本。
- 建议合入：`regex-tester.html`。
- 验收标准：
  - 显示每个分组编号、样例值、来源片段。
  - 替换文本引用不存在分组时给出提示。
  - 支持命名分组展示。
- 完成记录：2026-07-04 已新增 `regex-replacement-helper.js` 和 `tests/regex-replacement-helper.test.cjs`，支持从当前匹配结果生成 `$1`、`$2` 和 `$<name>` 等替换分组辅助信息；已在 `regex-tester.html` 替换文本区域下方接入分组辅助面板，展示分组编号、示例值、来源行列和来源片段，并支持点击 token 插入替换文本，版本更新至 V1.12。

## 文本转义转换工具

### TODO-ESCAPE-001：字符串字面量语言模式

- 状态：`[x]`
- 优先级：`P1`
- 类型：功能增强
- 目标：支持 Java、JavaScript、Python、SQL 等不同字符串字面量规则，减少转义差异导致的误转换。
- 建议合入：`text_escape_formatter_final.html`。
- 验收标准：
  - 可选择语言模式。
  - 每种模式有悬停说明和示例。
  - 默认模式保持当前行为。
- 完成记录：2026-07-04 已在 `text_escape_formatter_final.html` 增加字符串模式选择器，支持默认兼容、Java、JavaScript、Python、SQL 模式及悬停说明；`text-escape-core.js` 的转可读/转转义函数支持按模式处理 `\x`、`\u{}`、`\U` 和 SQL 单引号转义，默认模式保持原行为，版本更新至 V1.10。

### TODO-ESCAPE-002：多行文本转代码字符串

- 状态：`[x]`
- 优先级：`P1`
- 类型：功能增强
- 目标：将普通多行文本转换成代码中的字符串拼接形式，每行自动加引号、换行转义和拼接符。
- 建议合入：`text_escape_formatter_final.html`。
- 验收标准：
  - 支持至少 Java 风格输出。
  - 支持是否保留末尾 `\n`。
  - 输出可直接复制。
- 完成记录：2026-07-04 已在 `text_escape_formatter_final.html` 增加“多行转代码字符串”按钮和“保留每行末尾换行”开关；`text-escape-core.js` 新增 `convertMultilineToCodeString`，支持将普通多行文本转换为 Java 风格字符串拼接，处理双引号、反斜杠和行尾 `\n`，版本更新至 V1.11。

### TODO-ESCAPE-003：堆栈和日志清理

- 状态：`[x]`
- 优先级：`P2`
- 类型：功能增强
- 目标：支持去除日志前缀、统一缩进、提取 `Caused by`、清理多余空行等堆栈处理能力。
- 建议合入：`text_escape_formatter_final.html`。
- 验收标准：
  - 支持典型 Java 堆栈。
  - 可选择是否保留原始行。
  - 清理前后差异可见。
- 完成记录：2026-07-04 已在 `text_escape_formatter_final.html` 增加“清理堆栈日志”按钮和“保留无法识别为堆栈的原始行”开关；`text-escape-core.js` 新增 `cleanStackLog`，支持去除常见日志前缀、统一 Java `at` 行缩进、保留 `Caused by` / `Suppressed`，并清理多余空行，版本更新至 V1.12。

### TODO-ESCAPE-004：变量映射配置导入导出

- 状态：`[x]`
- 优先级：`P2`
- 类型：配置增强
- 目标：当前映射配置支持本地使用，进一步支持导入/导出，避免浏览器数据丢失。
- 建议合入：`text_escape_formatter_final.html`。
- 验收标准：
  - 可导出为 JSON。
  - 可从 JSON 导入并校验格式。
  - 导入不会覆盖已有配置，除非用户确认。
- 完成记录：2026-07-04 已在 `text_escape_formatter_final.html` 增加变量映射导出和导入按钮；`text-escape-core.js` 新增 `exportMappingPairs` 和 `importMappingPairs`，支持导出格式化 JSON、校验 JSON 数组、合并导入去重，并且只有用户确认后才覆盖当前映射，版本更新至 V1.13。

## URL 编解码工具

### TODO-URL-001：URL 参数分析器

- 状态：`[x]`
- 优先级：`P1`
- 类型：功能增强
- 目标：在现有 URL 编解码页面中解析协议、域名、端口、路径、Hash、Query 参数。
- 建议合入：`url-encoder.html`。
- 验收标准：
  - 输入 URL 后自动展示结构化字段。
  - Query 参数表格展示 key、value、decode 后 value。
  - 非完整 URL 有清晰提示或降级解析。
- 完成记录：2026-06-26 已在 `url-encoder.html` 中新增 URL 参数分析面板，支持解析协议、域名、端口、路径、Hash 和 Query 参数原始值/解码值；已更新 `tests/url-encoder.test.cjs` 并通过 `node tests\url-encoder.test.cjs`。

### TODO-URL-002：Query 参数编辑和反向组装

- 状态：`[x]`
- 优先级：`P1`
- 类型：功能增强
- 目标：支持对 Query 参数排序、删除、修改、复制，并重新组装成 URL。
- 建议合入：`url-encoder.html`。
- 验收标准：
  - 参数表支持编辑。
  - 支持按 key 排序。
  - 修改后可生成完整 URL。
- 完成记录：2026-07-05 已在 `url-encoder.html` 中支持 Query 参数原始 key/value 编辑、删除、单项复制、按参数名排序，并可将修改后的参数反向组装为完整 URL 输出；已更新 URL 编解码工具版本至 V1.04。

### TODO-URL-003：参数值自动识别和递归解码

- 状态：`[x]`
- 优先级：`P2`
- 类型：功能增强
- 目标：参数值自动尝试 URL Decode、Base64 Decode、JSON Parse，方便排查嵌套编码内容。
- 建议合入：`url-encoder.html`。
- 验收标准：
  - 自动识别结果只提示，不强制覆盖原值。
  - JSON 参数可格式化预览。
  - 异常内容不会报错打断页面。
- 完成记录：2026-07-05 已在 `url-encoder.html` 的 Query 参数表中新增识别结果列，对参数值自动提示多层 URL Decode、Base64 解码和 JSON 格式化预览；识别结果只作为提示展示，不覆盖原始参数值；已更新 URL 编解码工具版本至 V1.05。

## Base64 编解码工具

### TODO-BASE64-001：自动识别编码/解码方向

- 状态：`[x]`
- 优先级：`P1`
- 类型：功能增强
- 目标：根据输入内容判断更可能是普通文本还是 Base64，并给出推荐操作。
- 建议合入：`base64-encoder.html`。
- 验收标准：
  - Base64 特征明显时提示建议解码。
  - 普通文本时提示建议编码。
  - 推荐不替代用户手动操作。
- 完成记录：2026-07-10 已在 `base64-encoder.html` 中增加输入内容自动识别提示，能在明显 Base64 内容时推荐解码、普通文本时推荐编码；推荐只作为提示展示，不替代用户手动点击编码或解码按钮；已更新 Base64 编解码工具版本至 V1.01。

### TODO-BASE64-002：Base64URL 支持

- 状态：`[x]`
- 优先级：`P1`
- 类型：功能增强
- 目标：支持 Base64URL 与标准 Base64 互转，处理 `-`、`_`、省略 padding 的场景。
- 建议合入：`base64-encoder.html`。
- 验收标准：
  - 标准 Base64 可转 Base64URL。
  - Base64URL 可解码。
  - padding 缺失时自动补齐或提示。
- 完成记录：2026-07-10 已在 `base64-encoder.html` 中新增 Base64URL 支持，标准 Base64 可转换为 URL 安全格式，Base64URL 解码会自动补齐缺失 padding；已更新 Base64 编解码工具版本至 V1.02。

### TODO-BASE64-003：解码内容类型识别

- 状态：`[x]`
- 优先级：`P2`
- 类型：功能增强
- 目标：Base64 解码后自动识别 JSON、图片、普通文本等内容类型。
- 建议合入：`base64-encoder.html`。
- 验收标准：
  - JSON 可提示格式化。
  - 图片类内容可预览或提示 MIME。
  - 二进制内容不乱码污染页面。
- 完成记录：2026-07-10 已在 `base64-encoder.html` 中新增解码内容类型识别，支持识别 JSON 文本、常见图片文件头和二进制内容；二进制或图片内容不会按普通文本写入输出框，避免乱码污染页面；已更新 Base64 编解码工具版本至 V1.03。

### TODO-BASE64-004：文件摘要展示

- 状态：`[x]`
- 优先级：`P3`
- 类型：候选增强
- 目标：文件模式下展示 SHA-256、MD5 等摘要。若后续新增哈希工具，可改为跳转或复用哈希模块。
- 建议合入：`base64-encoder.html` 或新增哈希工具后复用。
- 验收标准：
  - 文件选择后能显示至少 SHA-256。
  - 大文件计算有进度或性能提示。
- 完成记录：2026-07-10 已在 `base64-encoder.html` 文件模式中新增 SHA-256 摘要展示，选择文件后会在浏览器本地计算摘要并显示，浏览器不支持时给出明确提示；已更新 Base64 编解码工具版本至 V1.04。

## 时间戳转换工具

### TODO-TIME-001：批量转换

- 状态：`[x]`
- 优先级：`P1`
- 类型：功能补齐
- 目标：补齐当前 Coming Soon 的批量转换能力，支持多行时间戳转日期、多行日期转时间戳。
- 建议合入：`timestamp-converter.html`。
- 验收标准：
  - 支持秒和毫秒。
  - 支持当前时区选择。
  - 单行错误不影响其他行转换，并输出错误行号。
- 完成记录：2026-06-26 已在 `timestamp-converter.html` 中启用批量转换 tab，支持多行时间戳转日期时间、多行日期时间转时间戳，逐行输出成功结果或错误行号；已新增 `tests/timestamp-converter.test.cjs` 并通过 `node tests\timestamp-converter.test.cjs`。

### TODO-TIME-002：相对时间计算

- 状态：`[x]`
- 优先级：`P2`
- 类型：功能增强
- 目标：支持 `now-7d`、`+3h`、`-30m` 等相对时间表达式。
- 建议合入：`timestamp-converter.html`。
- 验收标准：
  - 支持天、小时、分钟、秒。
  - 输出日期和时间戳。
  - 无效表达式有明确提示。
- 完成记录：2026-07-10 已在 `timestamp-converter.html` 单个转换区新增相对时间计算，支持 `now-7d`、`+3h`、`-30m` 等表达式，并同时输出指定时区下的日期时间和秒/毫秒时间戳；已更新时间戳转换工具版本至 V1.02。

### TODO-TIME-003：常用时区对比

- 状态：`[x]`
- 优先级：`P2`
- 类型：功能增强
- 目标：同一个时间同时展示多个常用时区结果。
- 建议合入：`timestamp-converter.html`。
- 验收标准：
  - 至少支持本地、UTC、Asia/Shanghai、America/New_York。
  - 可复制单个时区结果。
- 完成记录：2026-07-10 已在 `timestamp-converter.html` 单个转换区新增常用时区对比，支持同一时间戳同时展示本地、UTC、Asia/Shanghai、America/New_York 的日期时间，并可复制单个时区结果；已更新时间戳转换工具版本至 V1.03。

## 命名转换工具

### TODO-CASE-001：批量变量名转换

- 状态：`[x]`
- 优先级：`P1`
- 类型：功能增强
- 目标：支持每行一个变量名，批量转换为目标命名格式。
- 建议合入：`text-case-converter.html`、`text-case-converter.js`。
- 验收标准：
  - 保持输入行数和输出行数一致。
  - 空行处理稳定。
  - 支持一键复制全部结果。
- 完成记录：2026-07-10 已在 `text-case-converter.js` 新增按行批量转换能力，命名转换页面输入多行变量名时会逐行转换并保持空行与输出行数一致；已更新命名转换工具版本至 V1.04。

### TODO-CASE-002：识别 SQL / Java / JSON 字段并转换

- 状态：`[x]`
- 优先级：`P2`
- 类型：功能增强
- 目标：从 SQL 字段、Java 字段、JSON key 中提取名称并批量转换。
- 建议合入：`text-case-converter.html`。
- 验收标准：
  - 能从简单 SQL select 字段中提取名称。
  - 能从 Java 字段声明中提取字段名。
  - 能从 JSON key 中提取名称。
- 完成记录：2026-07-10 已在命名转换工具中新增字段提取转换，支持从简单 SQL select 字段、Java 字段声明和 JSON key 中提取名称，并批量转换为小驼峰或下划线命名；已更新命名转换工具版本至 V1.05。

### TODO-CASE-003：生成常见代码命名

- 状态：`[x]`
- 优先级：`P2`
- 类型：功能增强
- 目标：根据输入生成 Java 常量名、枚举名、Getter/Setter 名等常用代码命名。
- 建议合入：`text-case-converter.html`。
- 验收标准：
  - 至少支持常量名、Getter、Setter。
  - 布尔字段 `isEnabled` 等场景有合理处理。
- 完成记录：2026-07-10 已在命名转换工具中新增代码命名生成，可根据输入批量生成 Java 常量名、枚举名、Getter 和 Setter，并对 `isEnabled` 这类布尔字段生成 `isEnabled` / `setEnabled`；已更新命名转换工具版本至 V1.06。

### TODO-CASE-004：前后缀规则

- 状态：`[x]`
- 优先级：`P3`
- 类型：候选增强
- 目标：支持保留或移除常见前后缀，例如 `is`、`m`、`DTO`、`VO`。
- 建议合入：`text-case-converter.html`。
- 验收标准：
  - 可配置规则。
  - 默认不破坏当前转换行为。
- 完成记录：2026-07-10 已在命名转换工具中新增可选前后缀规则，支持按需移除 `is`、`m`、`DTO`、`VO` 等常见前后缀后再执行命名转换；默认不开启，不影响现有转换行为；已更新命名转换工具版本至 V1.07。

## 文本智能拆分工具

### TODO-SPLIT-001：按 Token 估算拆分

- 状态：`[x]`
- 优先级：`P1`
- 类型：功能增强
- 目标：增加适合 AI 提示词的 token 估算拆分模式，避免只按字符长度拆分。
- 建议合入：`text-splitter.html`、`text-splitter.js`。
- 验收标准：
  - 可在字符模式和 token 估算模式间切换。
  - 每段显示字符数和估算 token 数。
  - 不引入需要后端的依赖。
- 完成记录：2026-07-10 已在文本拆分工具中新增 Token 估算模式，可在字符长度和 token 估算之间切换；每段结果同时显示字符数和估算 token 数，不依赖后端服务；已更新文本拆分工具版本至 V1.04。

### TODO-SPLIT-002：分段前缀/后缀模板

- 状态：`[x]`
- 优先级：`P1`
- 类型：功能增强
- 目标：为每段自动加前缀或后缀，例如 `第 1/7 段：`，方便跨窗口粘贴。
- 建议合入：`text-splitter.html`。
- 验收标准：
  - 支持变量 `{index}`、`{total}`。
  - 可选择是否参与复制。
  - 页面上清晰展示实际复制内容。
- 完成记录：2026-07-11 已在文本拆分工具中新增分段前缀/后缀模板，支持 `{index}`、`{total}` 变量，并可选择复制时是否包含模板；预览和复制内容保持一致；已更新文本拆分工具版本至 V1.05。

### TODO-SPLIT-003：拆分策略选择

- 状态：`[ ]`
- 优先级：`P2`
- 类型：功能增强
- 目标：支持按行、段落、句子、字符等策略拆分。
- 建议合入：`text-splitter.html`、`text-splitter.js`。
- 验收标准：
  - 不同策略有清晰说明。
  - 超长单行仍能兜底拆分。
  - 测试覆盖中文、英文、代码文本。
- 完成记录：待填写。

### TODO-SPLIT-004：分段合并校验

- 状态：`[ ]`
- 优先级：`P2`
- 类型：质量提示
- 目标：校验所有分段按顺序合并后与原文一致，避免拆分或模板配置造成内容丢失。
- 建议合入：`text-splitter.html`。
- 验收标准：
  - 显示校验通过/失败。
  - 失败时提示首个差异位置。
  - 模板前后缀可选择是否参与校验。
- 完成记录：待填写。

## Neon Timer

### TODO-TIMER-001：常用倒计时预设

- 状态：`[ ]`
- 优先级：`P2`
- 类型：功能增强
- 目标：增加 5、10、25、45 分钟等预设按钮。
- 建议合入：`neon-timer/src`。
- 验收标准：
  - 仅在倒计时模式显示或合理展示。
  - 点击后更新倒计时时长。
  - 构建后 `dist` 导航正常。
- 完成记录：待填写。

### TODO-TIMER-002：结束提醒音和浏览器通知

- 状态：`[ ]`
- 优先级：`P2`
- 类型：功能增强
- 目标：倒计时结束时支持声音提示和浏览器通知。
- 建议合入：`neon-timer/src`。
- 验收标准：
  - 通知权限未授权时有提示。
  - 声音可开关。
  - 不影响秒表模式。
- 完成记录：待填写。

### TODO-TIMER-003：番茄钟模式

- 状态：`[ ]`
- 优先级：`P3`
- 类型：候选增强
- 目标：支持工作/休息循环，例如 25 分钟工作 + 5 分钟休息。
- 建议合入：`neon-timer/src`。
- 验收标准：
  - 可配置工作和休息时长。
  - 显示当前阶段。
  - 支持停止和重置。
- 完成记录：待填写。

### TODO-TIMER-004：全屏展示优化

- 状态：`[ ]`
- 优先级：`P2`
- 类型：交互增强
- 目标：优化全屏状态下的大数字布局、按钮可见性和键盘操作。
- 建议合入：`neon-timer/src`。
- 验收标准：
  - 桌面和移动端不裁切。
  - 支持键盘开始、暂停、重置。
  - 全屏退出后状态保持。
- 完成记录：待填写。

## 候选新增工具

### TODO-NEW-001：哈希/摘要工具

- 状态：`[ ]`
- 优先级：`P1`
- 类型：新增工具
- 目标：输入文本或文件，输出 MD5、SHA-1、SHA-256、SHA-512 等摘要。
- 建议路径：`hash-generator.html` 或更合适的名称。
- 验收标准：
  - 支持文本摘要。
  - 支持文件摘要。
  - 支持复制单个摘要。
  - 首页、导航、README、DEVELOPMENT 同步更新。
- 完成记录：待填写。

### TODO-NEW-002：JWT 解析工具

- 状态：`[ ]`
- 优先级：`P1`
- 类型：新增工具
- 目标：粘贴 JWT 后解析 Header、Payload，展示 `exp`、`iat` 等时间字段。
- 建议路径：`jwt-decoder.html`。
- 验收标准：
  - 明确标注仅本地解析，不做签名可信校验。
  - Header 和 Payload 格式化展示。
  - 过期时间展示为可读时间。
- 完成记录：待填写。

### TODO-NEW-003：UUID / 随机值生成器

- 状态：`[ ]`
- 优先级：`P2`
- 类型：新增工具
- 目标：生成 UUID v4、随机字符串、随机数字、密码，支持批量复制。
- 建议路径：`random-generator.html`。
- 验收标准：
  - 可配置数量和长度。
  - 可选择字符集。
  - 支持复制单个和全部。
- 完成记录：待填写。

### TODO-NEW-004：Cron 表达式解析工具

- 状态：`[ ]`
- 优先级：`P2`
- 类型：新增工具
- 目标：解析 Cron 表达式并展示最近几次执行时间，区分 Linux cron 和 Quartz cron。
- 建议路径：`cron-parser.html`。
- 验收标准：
  - 支持常见 5 段和 6/7 段表达式。
  - 展示最近 N 次执行时间。
  - 错误表达式提示具体位置。
- 完成记录：待填写。

### TODO-NEW-005：SQL 格式化/压缩工具

- 状态：`[ ]`
- 优先级：`P2`
- 类型：新增工具
- 目标：格式化 SQL、压缩 SQL、提取表名、查看参数占位符。
- 建议路径：`sql-formatter.html`。
- 验收标准：
  - 支持常见 SELECT / INSERT / UPDATE / DELETE 格式化。
  - 支持压缩为单行。
  - 提取表名和占位符时不阻塞格式化主流程。
- 完成记录：待填写。

## 新识别候选项

### TODO-IDEA-001：本地配置统一导入导出

- 状态：`[ ]`
- 优先级：`P3`
- 类型：候选增强
- 目标：为会保存本地配置的工具提供统一导入/导出能力，例如映射配置、拆分配置、正则模板。
- 完成记录：待填写。

### TODO-IDEA-002：示例数据统一管理

- 状态：`[ ]`
- 优先级：`P3`
- 类型：候选增强
- 目标：各工具常用示例数据逐步集中管理，减少散落在 HTML 中的样例字符串。
- 完成记录：待填写。

### TODO-IDEA-003：浏览器端冒烟测试

- 状态：`[ ]`
- 优先级：`P3`
- 类型：测试增强
- 目标：为重点页面增加轻量浏览器冒烟测试，检查页面可打开、主要按钮存在、基本转换可执行。
- 完成记录：待填写。

### TODO-IDEA-004：移动端布局基线检查

- 状态：`[ ]`
- 优先级：`P3`
- 类型：体验增强
- 目标：为输入输出型工具检查移动端布局，避免按钮换行、编辑器挤压、弹窗不可操作。
- 完成记录：待填写。
