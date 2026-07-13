(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }
    root.MobileLayoutBaseline = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    const MOBILE_LAYOUT_BASELINE_PAGES = [
        {
            path: 'timestamp-converter.html',
            requiredSnippets: ['@media (max-width: 600px)', 'flex-direction: column', 'grid-template-columns: 1fr'],
        },
        {
            path: 'url-encoder.html',
            requiredSnippets: ['@media (max-width: 900px)', 'grid-template-columns: 1fr', 'width: 100%'],
        },
        {
            path: 'text_escape_formatter_final.html',
            requiredSnippets: ['@media (max-width: 900px)', '@media (max-width: 640px)', 'grid-template-columns: 1fr'],
        },
        {
            path: 'text-splitter.html',
            requiredSnippets: ['@media (max-width: 900px)', '@media (max-width: 600px)', 'grid-template-columns: 1fr'],
        },
        {
            path: 'regex-tester.html',
            requiredSnippets: ['@media (max-width: 1200px)', '@media (max-width: 640px)', 'grid-template-columns: 1fr'],
        },
        {
            path: 'sql-formatter.html',
            requiredSnippets: ['@media (max-width: 960px)', 'grid-template-columns: 1fr', 'min-height: 260px'],
        },
        {
            path: 'html-formatter.html',
            requiredSnippets: ['@media (max-width: 900px)', 'grid-template-columns: 1fr', 'width: 100%'],
        },
    ];

    return { MOBILE_LAYOUT_BASELINE_PAGES };
});
