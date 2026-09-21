(function (root) {
    // Iterative syntax walk for engines whose SyntaxError omits a position.
    function scanError(text) {
        const stack = ['value'];
        let i = 0;
        const string = /"(?:[^"\\\u0000-\u001f]|\\(?:["\\/bfnrt]|u[0-9a-fA-F]{4}))*"/y;
        const primitive = /(?:true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/y;
        while (stack.length) {
            while (/[\x20\t\r\n]/.test(text[i] || '') && i < text.length) i++;
            const state = stack.pop();
            const c = text[i];
            if (state === 'end') return i;
            if (state === 'colon') { if (c !== ':') return i; i++; continue; }
            if (state === 'objectNext' || state === 'arrayNext') {
                const object = state === 'objectNext';
                if (c === (object ? '}' : ']')) { i++; continue; }
                if (c !== ',') return i;
                i++;
                stack.push(state, object ? 'key' : 'value');
                continue;
            }
            if (state === 'firstKey' && c === '}') { i++; continue; }
            if (state === 'firstValue' && c === ']') { i++; continue; }
            if (state === 'key' || state === 'firstKey') {
                string.lastIndex = i;
                const match = string.exec(text);
                if (!match) return i;
                i = string.lastIndex;
                if (state === 'firstKey') stack.push('objectNext');
                stack.push('value', 'colon');
                continue;
            }
            if (state === 'firstValue') stack.push('arrayNext');
            if (stack.length === 0) stack.push('end');
            if (c === '{') { i++; stack.push('firstKey'); continue; }
            if (c === '[') { i++; stack.push('firstValue'); continue; }
            const token = c === '"' ? string : primitive;
            token.lastIndex = i;
            if (!token.exec(text)) return i;
            i = token.lastIndex;
        }
        return i;
    }
    // Always inspect the original source, never offsets from an auto-repair attempt.
    function locateError(text) {
        let message;
        try { JSON.parse(text); return null; } catch (error) { message = error.message; }
        // A copied property fragment is supported by the repair pipeline. Validate
        // its contents with a virtual wrapper, but map every offset back to source.
        let inspected = text;
        let prefixLength = 0;
        if (/^\s*"(?:[^"\\]|\\.)*"\s*[:：]/.test(text)) {
            const wrapped = '{' + text + '}';
            try { JSON.parse(wrapped); } catch (error) {
                inspected = wrapped;
                prefixLength = 1;
                message = error.message;
            }
        }
        let offset;
        const position = message.match(/position\s+(\d+)/i);
        const coordinates = message.match(/line\s+(\d+)\s+column\s+(\d+)/i);
        if (position) offset = Number(position[1]);
        else if (coordinates) {
            const lines = inspected.split('\n');
            offset = lines.slice(0, Number(coordinates[1]) - 1).reduce((n, line) => n + line.length + 1, 0) + Number(coordinates[2]) - 1;
        } else if (/end of|end of data|unterminated/i.test(message)) offset = inspected.length;
        else offset = scanError(inspected);
        offset -= prefixLength;
        offset = Math.max(0, Math.min(text.length, offset));
        const prefix = text.slice(0, offset).split('\n');
        return { offset, line: prefix.length, column: prefix[prefix.length - 1].length + 1 };
    }

    function mount(input) {
        const shell = input.parentElement;
        const gutter = document.createElement('div');
        gutter.className = 'json-source-gutter';
        gutter.setAttribute('aria-hidden', 'true');
        const highlight = document.createElement('div');
        highlight.className = 'json-source-error-line';
        highlight.hidden = true;
        shell.prepend(gutter, highlight);
        let currentText = null;
        let location = null;
        function sync() {
            const lineHeight = parseFloat(getComputedStyle(input).lineHeight);
            gutter.scrollTop = input.scrollTop;
            if (location) highlight.style.top = (15 + (location.line - 1) * lineHeight - input.scrollTop) + 'px';
        }
        function clear() {
            location = null;
            highlight.hidden = true;
            input.removeAttribute('aria-invalid');
            gutter.querySelector('.is-error')?.classList.remove('is-error');
        }
        function refresh() {
            if (currentText !== input.value) {
                currentText = input.value;
                clear();
                const count = input.value.split('\n').length;
                gutter.textContent = '';
                const fragment = document.createDocumentFragment();
                for (let i = 1; i <= count; i++) {
                    const row = document.createElement('div');
                    row.textContent = i;
                    fragment.appendChild(row);
                }
                gutter.appendChild(fragment);
            }
            sync();
        }
        function markError() {
            refresh();
            clear();
            location = locateError(input.value);
            if (!location) return null;
            highlight.hidden = false;
            gutter.children[location.line - 1]?.classList.add('is-error');
            input.setAttribute('aria-invalid', 'true');
            input.focus({ preventScroll: true });
            input.setSelectionRange(location.offset, Math.min(input.value.length, location.offset + 1));
            const height = parseFloat(getComputedStyle(input).lineHeight);
            input.scrollTop = Math.max(0, (location.line - 1) * height - input.clientHeight / 2);
            sync();
            return location;
        }
        input.addEventListener('input', refresh);
        input.addEventListener('scroll', sync);
        refresh();
        return { refresh, clear, markError };
    }
    if (typeof module !== 'undefined' && module.exports) module.exports = { locateError };
    else root.JsonSourceEditor = { mount };
})(typeof window !== 'undefined' ? window : globalThis);
