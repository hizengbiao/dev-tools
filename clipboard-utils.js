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

    async function readClipboardText(options = {}) {
        const navigatorRef = options.navigatorRef
            || root.navigator
            || (typeof globalThis !== 'undefined' ? globalThis.navigator : null);
        if (!navigatorRef || !navigatorRef.clipboard || !navigatorRef.clipboard.readText) {
            return { ok: false, text: '', error: new Error('Clipboard read is not supported') };
        }

        try {
            const text = await navigatorRef.clipboard.readText();
            return { ok: true, text: String(text ?? '') };
        } catch (error) {
            return { ok: false, text: '', error };
        }
    }

    async function pasteText(targetOrId, options = {}) {
        const documentRef = getDocument(options);
        const target = typeof targetOrId === 'string'
            ? documentRef && documentRef.getElementById && documentRef.getElementById(targetOrId)
            : targetOrId;
        if (!target || !('value' in target)) {
            showToast(options.targetErrorMessage || '未找到可粘贴的输入框', { ...options, isError: true });
            return false;
        }

        const result = await readClipboardText(options);
        if (!result.ok) {
            showToast(options.errorMessage || '无法读取剪贴板，请允许剪贴板权限后重试', {
                ...options,
                isError: true
            });
            return false;
        }
        if (!result.text && options.allowEmpty !== true) {
            showToast(options.emptyMessage || '剪贴板中没有文本内容', { ...options, isError: true });
            return false;
        }

        target.value = result.text;
        const EventCtor = options.EventCtor
            || root.Event
            || (typeof globalThis !== 'undefined' ? globalThis.Event : null);
        if (target.dispatchEvent && EventCtor) {
            target.dispatchEvent(new EventCtor('input', { bubbles: true }));
        }
        if (target.focus) target.focus();
        if (target.setSelectionRange) {
            target.setSelectionRange(result.text.length, result.text.length);
        }
        showToast(options.successMessage || '已粘贴剪贴板内容', options);
        return true;
    }

    function installPasteButtonHandler(options = {}) {
        const documentRef = getDocument(options);
        if (!documentRef || !documentRef.addEventListener || documentRef.__clipboardPasteHandlerInstalled) return;
        documentRef.__clipboardPasteHandlerInstalled = true;
        documentRef.addEventListener('click', async event => {
            const button = event.target && event.target.closest
                ? event.target.closest('[data-clipboard-paste-target]')
                : null;
            if (!button || !button.dataset || !button.dataset.clipboardPasteTarget) return;

            button.disabled = true;
            try {
                await pasteText(button.dataset.clipboardPasteTarget, {
                    successMessage: button.dataset.clipboardPasteSuccess || '已粘贴剪贴板内容'
                });
            } finally {
                button.disabled = false;
            }
        });
    }

    const api = {
        showToast,
        writeClipboardText,
        copyText,
        readClipboardText,
        pasteText,
        installPasteButtonHandler
    };

    root.ClipboardUtils = api;
    installPasteButtonHandler();

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
})(typeof window !== 'undefined' ? window : globalThis);
