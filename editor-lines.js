(function (root) {
    function buildLineNumbers(text) {
        const lineCount = String(text || '').split('\n').length;
        return Array.from({ length: lineCount }, (_, index) => index + 1).join('\n');
    }

    function syncLineNumberScroll(textarea, lineNumbers) {
        if (!textarea || !lineNumbers) return;
        lineNumbers.scrollTop = textarea.scrollTop;
    }

    function refreshLineNumbers(textarea, lineNumbers) {
        if (!textarea || !lineNumbers) return;
        lineNumbers.textContent = buildLineNumbers(textarea.value);
        syncLineNumberScroll(textarea, lineNumbers);
    }

    const api = {
        buildLineNumbers,
        refreshLineNumbers,
        syncLineNumberScroll
    };

    root.EditorLines = api;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
})(typeof window !== 'undefined' ? window : globalThis);
