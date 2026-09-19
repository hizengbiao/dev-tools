document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('sql-examples-modal');
    const openButton = document.getElementById('sql-examples-btn');
    const closeButton = document.getElementById('close-sql-examples');
    const search = document.getElementById('sql-example-search');
    const category = document.getElementById('sql-example-category');
    const list = document.getElementById('sql-example-list');
    const status = document.getElementById('sql-example-status');
    let previousOverflow = '';
    for (const name of new Set(SqlExamples.examples.map(item => item.category))) {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        category.appendChild(option);
    }

    function close() {
        modal.style.display = 'none';
        document.body.style.overflow = previousOverflow;
        openButton.focus({ preventScroll: true });
    }

    function render() {
        const query = search.value.trim().toLowerCase();
        const items = SqlExamples.examples.filter(item =>
            (!category.value || item.category === category.value) &&
            [item.title, item.description, item.note || '', item.sql].join(' ').toLowerCase().includes(query));
        list.replaceChildren();
        status.textContent = `共 ${items.length} 个示例`;
        if (!items.length) {
            const empty = document.createElement('p');
            empty.textContent = '没有匹配的示例，请更换关键词或选择全部分类。';
            list.appendChild(empty);
        }
        for (const item of items) {
            const card = document.createElement('article');
            card.className = 'sql-example-card';
            const header = document.createElement('div');
            header.className = 'sql-example-heading';
            const title = document.createElement('h4');
            title.textContent = item.title;
            const actions = document.createElement('div');
            actions.className = 'sql-example-actions';
            const copy = document.createElement('button');
            copy.className = 'btn';
            copy.type = 'button';
            copy.textContent = '复制 SQL';
            copy.setAttribute('aria-label', `复制 SQL：${item.title}`);
            copy.addEventListener('click', async () => {
                const ok = await ClipboardUtils.copyText(item.sql);
                status.textContent = ok ? `已复制：${item.title}` : '复制失败，请手动选择示例文本复制。';
            });
            const use = document.createElement('button');
            use.className = 'btn btn-primary';
            use.type = 'button';
            use.textContent = '回填并格式化';
            use.setAttribute('aria-label', `回填并格式化：${item.title}`);
            use.addEventListener('click', () => {
                const input = document.getElementById('sql-input');
                input.value = item.sql;
                input.dispatchEvent(new Event('input', { bubbles: true }));
                document.getElementById('format-btn').click();
                close();
                input.focus({ preventScroll: true });
            });
            actions.append(copy, use);
            header.append(title, actions);
            const description = document.createElement('p');
            description.textContent = item.description;
            card.append(header, description);
            if (item.note) {
                const note = document.createElement('p');
                note.className = 'sql-example-note';
                note.textContent = item.note;
                card.appendChild(note);
            }
            const pre = document.createElement('pre');
            const code = document.createElement('code');
            code.textContent = item.sql;
            pre.appendChild(code);
            card.appendChild(pre);
            list.appendChild(card);
        }
    }
    openButton.addEventListener('click', () => {
        previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        modal.style.display = 'flex';
        render();
        search.focus({ preventScroll: true });
    });
    closeButton.addEventListener('click', close);
    search.addEventListener('input', render);
    category.addEventListener('change', render);
    document.addEventListener('keydown', event => {
        if (modal.style.display !== 'flex') return;
        if (event.key === 'Escape') { event.preventDefault(); close(); }
        if (event.key === 'Tab') {
            const controls = [...modal.querySelectorAll('button, input, select, a[href]')];
            const first = controls[0];
            const last = controls[controls.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault(); last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault(); first.focus();
            }
        }
    });
});
