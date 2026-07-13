(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }
    root.BrowserSmokeManifest = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    const BROWSER_SMOKE_PAGES = [
        {
            path: 'json-parser.html',
            title: 'JSON 格式化工具',
            markers: ['粘贴并格式化', 'json-input'],
            selectors: ['#json-input', 'button'],
        },
        {
            path: 'timestamp-converter.html',
            title: '时间戳转换工具',
            markers: ['ts-input', 'date-input'],
            selectors: ['#ts-input', '#date-input'],
        },
        {
            path: 'url-encoder.html',
            title: 'URL 编解码工具',
            markers: ['input-text', 'output-text'],
            selectors: ['#input-text', '#output-text'],
        },
        {
            path: 'base64-encoder.html',
            title: 'Base64 编解码工具',
            markers: ['input-text', 'output-text'],
            selectors: ['#input-text', '#output-text'],
        },
        {
            path: 'hash-generator.html',
            title: '哈希/摘要工具',
            markers: ['text-input', 'hash-results'],
            selectors: ['#text-input', '#hash-results'],
        },
        {
            path: 'jwt-decoder.html',
            title: 'JWT 解析工具',
            markers: ['jwt-input', 'sample-btn'],
            selectors: ['#jwt-input', '#sample-btn'],
        },
        {
            path: 'random-generator.html',
            title: 'UUID / 随机值生成器',
            markers: ['valueType', 'resultList'],
            selectors: ['#valueType', '#resultList'],
        },
        {
            path: 'cron-parser.html',
            title: 'Cron 表达式解析与生成工具',
            markers: ['cron-input', 'parse-btn', 'generator-tab', 'schedule-type'],
            selectors: ['#cron-input', '#parse-btn', '#generator-tab'],
        },
        {
            path: 'sql-formatter.html',
            title: 'SQL 格式化/压缩工具',
            markers: ['sql-input', 'format-btn'],
            selectors: ['#sql-input', '#format-btn'],
        },
        {
            path: 'text-case-converter.html',
            title: '文本命名转换工具',
            markers: ['input-text', 'output-text'],
            selectors: ['#input-text', '#output-text'],
        },
        {
            path: 'text_escape_formatter_final.html',
            title: '文本转义转换工具',
            markers: ['inputText', 'outputText'],
            selectors: ['#inputText', '#outputText'],
        },
        {
            path: 'text-splitter.html',
            title: '文本智能拆分',
            markers: ['inputText', 'splitBtn'],
            selectors: ['#inputText', '#splitBtn'],
        },
        {
            path: 'regex-tester.html',
            title: '正则表达式测试工具',
            markers: ['testText', 'patternInput'],
            selectors: ['#testText', '#patternInput'],
        },
        {
            path: 'html-formatter.html',
            title: 'HTML 元素格式化工具',
            markers: ['html-input', 'format-btn'],
            selectors: ['#html-input', '#format-btn'],
        },
    ];

    return { BROWSER_SMOKE_PAGES };
});
