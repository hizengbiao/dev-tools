(function () {
    const byId = id => document.getElementById(id);
    const input = byId('radix-input');
    const status = byId('status');
    const resultCards = [];
    const commonBases = [2, 8, 10, 16];
    const names = ['二进制 BIN', '八进制 OCT', '十进制 DEC', '十六进制 HEX'];
    let currentBases = [];
    let conversionTimer = null;
    let composing = false;
    for (let index = 0; index < commonBases.length; index++) {
        const card = document.createElement('section');
        card.className = 'result-card';
        const header = document.createElement('div');
        header.className = 'panel-header';
        const title = document.createElement('h3');
        title.textContent = names[index];
        const actions = document.createElement('div');
        actions.className = 'actions';
        const copy = document.createElement('button');
        copy.type = 'button';
        copy.textContent = '复制';
        copy.setAttribute('aria-label', '复制' + names[index]);
        copy.disabled = true;
        const reuse = document.createElement('button');
        reuse.type = 'button';
        reuse.textContent = '回填输入';
        reuse.setAttribute('aria-label', names[index] + '回填输入');
        reuse.disabled = true;
        const output = document.createElement('textarea');
        output.id = 'result-' + index;
        output.readOnly = true;
        output.wrap = 'soft';
        output.spellcheck = false;
        output.setAttribute('aria-label', names[index] + '结果');
        output.placeholder = '等待转换';
        copy.addEventListener('click', () => ClipboardUtils.copyText(output.value));
        reuse.addEventListener('click', () => {
            const value = output.value;
            const base = currentBases[index];
            byId('source-base').value = commonBases.includes(base) ? String(base) : 'custom';
            byId('custom-source').value = String(base);
            input.value = value;
            invalidate();
            input.focus({ preventScroll: true });
            convert();
        });
        actions.append(copy, reuse);
        header.append(title, actions);
        card.append(header, output);
        byId('results').append(card);
        resultCards.push({ title, output, copy, reuse });
    }
    function setStatus(text, kind = '') {
        status.textContent = text;
        status.className = 'status' + (kind ? ' ' + kind : '');
    }
    function invalidate() {
        clearTimeout(conversionTimer);
        conversionTimer = null;
        status.setAttribute('aria-busy', 'false');
        byId('custom-source-label').hidden = byId('source-base').value !== 'custom';
        for (const card of resultCards) {
            card.output.value = '';
            card.copy.disabled = true;
            card.reuse.disabled = true;
        }
        currentBases = [];
        byId('copy-all').disabled = true;
        setStatus('输入整数后自动转换。');
    }
    function scheduleConversion() {
        invalidate();
        if (!input.value.trim() || composing) return;
        setStatus('正在等待输入完成…');
        status.setAttribute('aria-busy', 'true');
        conversionTimer = setTimeout(convert, 150);
    }
    function updateOptions() {
        if (input.value.trim() && !composing) convert();
        else invalidate();
    }
    function convert() {
        invalidate();
        try {
            const selected = byId('source-base').value;
            const source = Number(selected === 'custom' ? byId('custom-source').value : selected);
            currentBases = [...commonBases];
            const rows = RadixConverter.convertBatch(input.value, source, currentBases, {
                uppercase: byId('uppercase').checked,
                prefix: byId('prefix').checked
            });
            const errors = rows.filter(row => row.error);
            resultCards.forEach((card, i) => {
                card.output.value = rows.map(row => row.error ? '⚠ 第 ' + row.line + ' 行无效' : row.outputs[i]).join('\n');
                card.copy.disabled = errors.length > 0;
                card.reuse.disabled = errors.length > 0;
            });
            byId('copy-all').disabled = errors.length > 0;
            setStatus('共 ' + rows.length + ' 项，成功 ' + (rows.length - errors.length) + ' 项' + (errors.length ? '，失败 ' + errors.length + ' 项；请修正后复制或回填。' : '。'), errors.length ? 'error' : 'success');
            if (errors.length) {
                const list = document.createElement('ul');
                for (const row of errors) {
                    const item = document.createElement('li');
                    item.textContent = '第 ' + row.line + ' 行：' + row.error;
                    list.append(item);
                }
                status.append(list);
            }
        } catch (error) {
            setStatus(error.message, 'error');
        }
    }
    input.addEventListener('input', scheduleConversion);
    input.addEventListener('compositionstart', () => { composing = true; invalidate(); });
    input.addEventListener('compositionend', () => { composing = false; scheduleConversion(); });
    input.addEventListener('keydown', event => {
        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); convert(); }
    });
    for (const id of ['source-base', 'custom-source', 'uppercase', 'prefix']) byId(id).addEventListener('change', updateOptions);
    byId('custom-source').addEventListener('input', scheduleConversion);
    byId('convert-btn').addEventListener('click', convert);
    byId('clear-btn').addEventListener('click', () => {
        input.value = '';
        invalidate();
        setStatus('已清空。');
        input.focus({ preventScroll: true });
    });
    byId('sample-btn').addEventListener('click', () => {
        byId('source-base').value = '10';
        input.value = '255\n-1024\n9007199254740993';
        convert();
    });
    byId('copy-input').addEventListener('click', () => input.value ? ClipboardUtils.copyText(input.value) : ClipboardUtils.showToast('输入内容为空'));
    byId('copy-all').addEventListener('click', () => ClipboardUtils.copyText(resultCards.map(card => card.title.textContent + '\n' + card.output.value).join('\n\n')));
    byId('custom-source-label').hidden = true;
})();
