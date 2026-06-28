(function (root) {
    const toastTimers = new Map();

    function getDocument(options = {}) {
        return options.documentRef
            || root.document
            || (typeof globalThis !== 'undefined' ? globalThis.document : null);
    }

    function getToastElement(options = {}) {
        const documentRef = getDocument(options);
        if (options.toastElement) return options.toastElement;
        if (!documentRef || !documentRef.getElementById) return null;
        return documentRef.getElementById(options.toastId || 'toast');
    }

    function showToast(message, options = {}) {
        const toast = getToastElement(options);
        if (!toast) return;

        const showClass = options.showClass || 'show';
        const errorClass = options.errorClass || 'error';
        const duration = options.duration === undefined ? 2000 : options.duration;
        toast.textContent = message;
        toast.className = options.isError ? `${showClass} ${errorClass}` : showClass;

        const clearTimer = root.clearTimeout
            || (typeof globalThis !== 'undefined' && globalThis.clearTimeout)
            || clearTimeout;
        const setTimer = root.setTimeout
            || (typeof globalThis !== 'undefined' && globalThis.setTimeout)
            || setTimeout;
        const timerKey = options.toastId || 'toast';
        if (toastTimers.has(timerKey)) {
            clearTimer(toastTimers.get(timerKey));
        }

        if (duration > 0) {
            toastTimers.set(timerKey, setTimer(() => {
                toast.className = '';
                toastTimers.delete(timerKey);
            }, duration));
        }
    }

    async function writeClipboardText(value, options = {}) {
        const text = String(value ?? '');
        const navigatorRef = options.navigatorRef
            || root.navigator
            || (typeof globalThis !== 'undefined' ? globalThis.navigator : null);
        const documentRef = getDocument(options);

        if (navigatorRef && navigatorRef.clipboard && navigatorRef.clipboard.writeText) {
            try {
                await navigatorRef.clipboard.writeText(text);
                return true;
            } catch (error) {
                // Fall through to the textarea fallback below.
            }
        }

        if (!documentRef || !documentRef.createElement || !documentRef.body || !documentRef.execCommand) {
            return false;
        }

        const textarea = documentRef.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute && textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        textarea.style.top = '0';
        documentRef.body.appendChild(textarea);
        textarea.focus();
        textarea.select();

        let ok = false;
        try {
            ok = documentRef.execCommand('copy');
        } finally {
            documentRef.body.removeChild(textarea);
        }
        return ok;
    }

    async function copyText(value, options = {}) {
        const text = String(value ?? '');
        if (!text && options.emptyMessage) {
            showToast(options.emptyMessage, { ...options, isError: true });
            return false;
        }

        const ok = await writeClipboardText(text, options);
        showToast(
            ok ? (options.successMessage || '已复制到剪贴板') : (options.errorMessage || '复制失败，请手动复制'),
            { ...options, isError: !ok }
        );
        return ok;
    }

    const api = {
        showToast,
        writeClipboardText,
        copyText
    };

    root.ClipboardUtils = api;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
})(typeof window !== 'undefined' ? window : globalThis);
