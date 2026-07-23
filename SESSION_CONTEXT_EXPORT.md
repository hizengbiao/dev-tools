# Dev Tools 会话上下文导出

> 导出日期：2026-07-17  
> 工作区：`D:\projects\vibe-coding\dev-tools`  
> 用途：在新 Codex 会话中恢复项目背景、协作约定和当前进度。

## 新会话使用方式

项目根目录已提供 `AGENTS.md`。新会话以 `D:\projects\vibe-coding\dev-tools` 为工作目录时，Codex 会自动读取该入口，并按要求继续读取本文件和 `docs\toolbox-todo.md`，通常不需要手动导入。

如果新会话未以项目目录为工作目录，可直接发送：

```text
请先读取并遵守 D:\projects\vibe-coding\dev-tools\SESSION_CONTEXT_EXPORT.md，
再读取 D:\projects\vibe-coding\dev-tools\docs\toolbox-todo.md。
请核对当前 git 状态和最新提交后再开始修改，不要覆盖未提交的用户改动。
后续直接实现需求；修改完成后自动测试、使用中文且不含日期的提交说明提交，并推送到 gh/main。
```

本文件是会话摘要，不替代代码和测试。若摘要与当前仓库不一致，以当前代码、`git status`、测试结果为准。

## 当前仓库状态

- 分支：`main`
- 推送远端：`gh`，地址为 `git@github.com:hizengbiao/dev-tools.git`
- 导出时 HEAD：`358dd9c 优化工具页面大文本粘贴定位`
- 导出时工作区：干净
- 工程形态：以独立静态 HTML 工具页为主，公共 JavaScript/CSS 模块复用，无统一后端
- 测试目录：`tests/*.test.cjs`
- 导出时测试文件数量：50
- 主 TODO：`docs/toolbox-todo.md`
- TODO 状态：50 个正式条目均为 `[x]`，当前没有未开始或进行中的正式条目

## 长期协作约定

1. 使用中文沟通，直接实现明确需求，不要反复找用户确认。
2. 每次代码修改完成后自动运行相关测试和 `git diff --check`。
3. 每次修改完成后自动提交并推送到 `gh/main`，除非用户明确要求不提交或不推送。
4. Git 提交说明使用中文，不在提交说明中写日期。
5. 不撤销、覆盖或清理用户已有的无关改动；工作区不干净时只提交本次涉及文件。
6. 页面功能变化通常需要同步更新版本号和版本更新说明。
7. 版本更新说明必须使用实际修改/提交日期；今天的版本不能放在旧日期下。
8. 同一天的多个版本说明放在同一个日期标题下，不重复日期标题。
9. 新增工具时同步维护 `nav.js`、`index.html`、`README.md`、`DEVELOPMENT.md` 和相应测试。
10. UI 改动尽量沿用 JSON 格式化工具及现有工具的布局、按钮、行号、版本弹窗和反馈风格。
11. 涉及浏览器交互时，不只做静态检查；应启动本地服务器并验证真实页面行为。
12. 使用 `apply_patch` 做人工文件修改，避免无关格式化和元数据改动。

## 工具注册与默认顺序

工具导航的权威注册表位于 `nav.js`。导出时顺序如下：

1. 首页：`index.html`
2. JSON 格式化：`json-parser.html`
3. 命名转换：`text-case-converter.html`
4. 正则测试：`regex-tester.html`
5. 文本转义：`text_escape_formatter_final.html`
6. 文本拆分：`text-splitter.html`
7. Cron 解析：`cron-parser.html`
8. HTML 格式化：`html-formatter.html`
9. Nginx 格式化：`nginx-formatter.html`
10. 时间戳转换：`timestamp-converter.html`
11. URL 编解码：`url-encoder.html`
12. Base64：`base64-encoder.html`
13. 哈希摘要：`hash-generator.html`
14. JWT 解析：`jwt-decoder.html`
15. 随机生成：`random-generator.html`
16. SQL 格式化：`sql-formatter.html`
17. Neon Timer：`neon-timer/dist/index.html`

顶部导航支持用户自定义显示项和拖动排序，配置保存在浏览器中。新增工具时，即使用户已有自定义配置，也应默认把新工具追加到其导航。首页顺序不受用户自定义导航影响，但默认工具顺序变更时通常需要同步首页。

## 公共模块和关键约束

- `nav.js` / `nav.css`：共享顶部导航、展开全部、自定义导航、滚轮横向滚动等；自定义导航条目在窄屏和页面全局表单样式下仍保持“勾选框、完整名称、拖动按钮”单行布局。
- `changelog.js` / `changelog.css`：统一版本更新说明弹窗行为和外观；弹窗限制在视口内，标题栏固定、内容区独立滚动，并统一支持 Esc 关闭、焦点恢复和键盘打开。页面仅维护各自的版本记录内容。
- `editor-lines.js`：输入输出框行号和滚动同步。
- `clipboard-utils.js`：复制、降级复制、读取剪贴板、通过 `data-clipboard-paste-target` 向指定输入框粘贴文本，并可通过 `data-clipboard-paste-action` 自动点击页面原有主操作按钮，以及 Toast。
- `diff-viewer.js`：输入输出差异计算与渲染；删除内容不用删除线，只使用背景标记。
- `sample-data.js`：部分工具的公共示例数据。
- `browser-smoke-manifest.js`：重点工具浏览器冒烟清单。
- `mobile-layout-baseline.js`：移动布局基线配置。
- 页面本地配置通常使用 `localStorage`。注意 `file://` 和 `http://127.0.0.1` 属于不同存储来源，测试时配置不会互通。

## 重点工具当前设计

### JSON 格式化

- 支持格式化、压缩、修复、编辑、撤销/重做、排序、JSON/Java 互转、加载示例。
- 修复日志前缀加 JSON 时，应提取真正的 JSON 值，不要把前缀包装成 key。
- 例如 `消费到...异常信号：{"objectType":"K8sWorker"}` 应得到从 `objectType` 开始的对象。
- 支持多段 `[...]` 日志标签、赋值前缀、Java toString/Map 风格及 `ClassName(key=value, ...)` DTO 字符串等宽松输入修复；DTO 值中的 IP、协议、端口列表逗号应完整保留。
- 树形结果支持层级背景、折叠、编辑、复制路径及 JSON 字符串字段就地展开/恢复。
- 用户已明确移除顶部 JSON Path 查询、字段路径面板和搜索 JSON 面板，不要未经需求重新加入。

### 正则测试

- 支持匹配、替换、行列定位、分组高亮、模板、性能风险提示、结果导出和四种可视化视图。
- 支持 Java 风格内联标志，例如 `(?i)`，浏览器执行前由运行时工具转换。
- 正则可视化需保持连续字面量合并、转义后显示、字符组纵向排列和否定字符组语义。
- 大文本粘贴后页面应保持原滚动位置，尤其在页面顶部粘贴时不能跳到底部。

### 文本转义

- 保留核心的转可读文本、转转义文本、合并拼接字符串、变量映射合并/恢复和复制能力。
- 已移除字符串模式、多行转代码字符串和清理堆栈日志入口，不要恢复。
- Java 拼接字符串转可读文本时先拼接再处理转义；合并拼接字符串本身不应错误转换引号内 `\n`、`\t`。
- 映射配置一条包含两个等价方向的值，可用于合并和反向恢复。
- 大文本粘贴同样不能导致页面滚动到底部。

### 文本拆分

- 默认按不超过指定字符长度拆分，默认最大长度 2900；优先在换行、标点、空格或词边界拆分。
- 每段可单独复制、复制全部、以 600ms 间隔依次写入剪贴板历史。
- 每段预览约五六行，支持内部滚动和全屏查看；输入和结果支持行号。
- 已移除拆分模式、分段前后缀及模板相关 UI，不要恢复。
- V1.09 新增脱敏/反脱敏：映射为 `{plain, masked}`，支持导入导出、浏览器保存、默认启用；开始拆分前先脱敏，另有反脱敏动作把结果显示到输出区。
- 脱敏逻辑位于 `text-masker.js`，采用单次扫描，避免映射之间发生连锁替换。
- 脱敏配置弹窗仅允许通过保存、取消和关闭按钮关闭；点击弹窗外部或按 Esc 不关闭，避免未保存映射意外丢失。

### HTML 与 Nginx 格式化

- 处理结果交互参考 JSON 格式化：行号、不同层级背景、悬停深度、展开/收起、编辑、删除、复制等。
- HTML 工具支持预览和区块编辑/删除；已移除缩进选择、冗余 tab、状态提示和元素统计栏。
- Nginx 注释统一为绿色；收起区块时隐藏内部注释，右花括号与左花括号在同一行，操作按钮放在右花括号右侧。
- Nginx 加载示例后自动格式化；区块编辑必须精确保留边界，避免多出或缺失括号/内容。

### Cron 解析

- 支持 Linux 5 段和 Quartz 6/7 段解析，使用自然中文说明执行时间。
- 支持弹窗式表达式字段可视化，按位置展示字段名称、原始值、可用范围和当前取值含义，并区分 Linux 5 段与 Spring / Quartz 6、7 段；当前表达式片段、字段流程节点和详情支持联动高亮；步进字段同时说明执行间隔和实际触发位置，并拆解斜杠左侧、步进运算符及右侧间隔值；通配字段使用每天、每月、每年等通俗时间语境；桌面端 6/7 段流程图在弹窗内自适应完整显示，窄屏采用三列排列。
- 最近执行时间显示 `年-月-日 时:分:秒` 的 24 小时格式，并与页面标注的时区一致。
- 带起点的分钟和秒步进表达式优先列出实际触发位置，例如 `6/30 * * * *` 说明为“每小时在第 6、36 分钟执行”；触发位置过多时再使用“从第 N 分钟/秒开始，每隔 M 分钟/秒”的概括说法。
- 多个日期和时间字段同时使用步进语法时，执行说明基于解析后的实际取值组合生成；例如 `6/30 1/10 2/3 * *` 会分别列出每月触发日期和当天的六个执行时刻，避免逐字段机械拼接。
- 支持逆向生成多种 Cron 格式，包括类似 `0 18 0/3 * * ?` 的 Quartz 步进小时表达式。
- “最近执行时间条目数”默认 5，需有直观说明。

### 共享导航与首页

- 首页桌面布局为一行 5 个工具卡片。
- 导航图标复用首页工具图标，修改图标时两处保持一致。
- 导航可临时展开全部、收起、自定义勾选和拖动排序；收起状态下滚轮可横向滚动工具项。
- 导航内容应充分利用两边宽度；Neon Timer 构建产物也必须正常接入共享导航。

## 最近完成但未纳入旧 TODO 的功能

### 文本拆分脱敏/反脱敏

- 相关文件：`text-splitter.html`、`text-masker.js`、`tests/text-masker.test.cjs`
- 版本：V1.09
- 提交：`4a2fc5f 增加文本拆分脱敏反脱敏功能`
- 配置存入浏览器，支持 JSON 导入导出，默认勾选启用。

### 大文本粘贴保持页面位置

- 相关文件：`nav.js`、`regex-tester.html`、`text_escape_formatter_final.html`、`tests/paste-scroll-guard.test.cjs`
- 正则版本：V1.13
- 文本转义版本：V1.15
- 提交：`358dd9c 优化工具页面大文本粘贴定位`
- `nav.js` 使用捕获阶段监听 textarea/contenteditable 的 paste，在多个动画帧及延迟阶段恢复页面滚动位置。
- 已检查所有根目录中包含 textarea 的 13 个 HTML 页面均加载 `nav.js`，因此共享保护覆盖这些页面。

## 最近提交记录

```text
358dd9c 优化工具页面大文本粘贴定位
4a2fc5f 增加文本拆分脱敏反脱敏功能
0ac62c5 调整HTML工具栏对齐
cb66b71 扩展HTML格式化展示区域
fb687cc 优化Nginx折叠操作和示例加载
3554a44 优化Nginx区块收起展示
8df92f6 增加JSON加载示例功能
98d5fe7 2026-07-15 调整Nginx工具栏对齐
f7691b1 2026-07-15 增加Nginx收起匹配括号
235e225 2026-07-15 统一Nginx注释颜色
96f0be3 2026-07-15 优化Nginx工具栏和显示宽度
9039462 2026-07-15 扩展顶部导航可用宽度
```

历史提交中仍有日期是旧规则遗留；后续提交说明不要再包含日期。

## TODO 使用规则

- 正式清单位于 `docs/toolbox-todo.md`。
- 导出时 50 个条目均标记完成，没有剩余正式 TODO。
- 后续识别到新功能时，应先按现有规范新增一个粒度适中的 TODO，再实现并标记完成。
- 不要为了推进清单而反复拆分微小细节；用户已明确表示不要一直抠细节。
- 完成记录要写真实日期，并附实现范围和测试结果。

## 测试与验证

运行单项测试：

```powershell
node tests\对应测试文件.test.cjs
git diff --check
```

运行全部测试：

```powershell
$ErrorActionPreference = 'Stop'
$tests = Get-ChildItem tests -Filter '*.test.cjs' | Sort-Object Name
$passed = 0
foreach ($test in $tests) {
    & node $test.FullName
    if ($LASTEXITCODE -ne 0) { throw "Test failed: $($test.Name)" }
    $passed++
}
git diff --check
Write-Output "ALL_TESTS_PASSED=$passed"
```

启动静态服务器进行真实浏览器验证：

```powershell
Start-Process -FilePath python `
    -ArgumentList '-m','http.server','5199','--bind','127.0.0.1' `
    -WorkingDirectory 'D:\projects\vibe-coding\dev-tools' `
    -WindowStyle Hidden
```

浏览器验证注意事项：

- 优先验证桌面和窄屏布局是否无重叠、裁切和无效大空白。
- 大文本场景要实际粘贴，不只触发 input 事件。
- 浏览器可能缓存旧 `nav.js`；必要时使用新端口、查询参数或新页面会话验证。
- 本地 favicon 404 通常不影响工具功能，不要将其误判为业务错误。
- Playwright 临时目录（如 `.playwright-cli`）不要提交。

## Git 提交流程

```powershell
git status --short
git diff --check
git add <本次涉及文件>
git commit -m "中文且不含日期的提交说明"
git push gh main
```

如果 SSH 推送出现瞬时网络失败，应先重试，不要在代码已经提交后直接停下。最终汇报应说明修改内容、测试结果、提交哈希和推送状态。

## 新会话开始前的最小核对

1. `git status --short`
2. `git log -5 --oneline`
3. 阅读本文件和 `docs/toolbox-todo.md`
4. 打开用户指定页面及相关公共模块
5. 检查现有测试，优先沿用已有实现模式
6. 完成后测试、更新版本说明、提交并推送
