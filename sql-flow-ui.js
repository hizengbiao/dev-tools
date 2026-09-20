(function () {
    let stages = [], active = 0, timer = null, currentModel = null;
    const byId = id => document.getElementById(id);
    function el(tag, className, text) {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined) node.textContent = text;
        return node;
    }
    function stop() {
        clearInterval(timer); timer = null;
        byId('flow-play').textContent = '▶ 播放';
    }
    function table(rows, removed = new Set()) {
        const wrap = el('div', 'flow-table-scroll');
        if (!rows.length) { wrap.append(el('p', 'flow-empty', '没有数据行')); return wrap; }
        const columns = [...new Set(rows.flatMap(r => Object.keys(r.values)))];
        const grid = el('table', 'flow-table');
        const head = el('tr');
        ['来源行', ...columns].forEach(k => head.append(el('th', '', k)));
        const thead = el('thead'); thead.append(head); grid.append(thead);
        const body = el('tbody');
        rows.slice(0, 50).forEach(row => {
            const tr = el('tr', row.ids.every(id => removed.has(id)) ? 'flow-removed' : '');
            tr.dataset.sourceIds = row.ids.join(',');
            const lineage = el('td', 'flow-lineage', row.ids.map(id => '#' + id).join(' '));
            lineage.style.borderLeft = `4px solid hsl(${(row.ids[0] || 0) * 67 % 360} 65% 50%)`;
            tr.append(lineage);
            columns.forEach(k => tr.append(el('td', '', row.values[k] === null ? 'NULL' : String(row.values[k] ?? ''))));
            body.append(tr);
        });
        grid.append(body); wrap.append(grid);
        if (rows.length > 50) wrap.append(el('p', '', `展示前 50 行，实际参与演算 ${rows.length} 行。`));
        return wrap;
    }
    function render() {
        const stage = stages[active];
        const rail = byId('flow-steps'); rail.replaceChildren();
        stages.forEach((s, i) => {
            if (i) rail.append(el('span', 'flow-rail-arrow', '→'));
            const button = el('button', 'flow-step' + (i === active ? ' active' : ''), `${i + 1}. ${s.name}\n${s.after.length} ${s.name === 'GROUP BY' || s.name === 'HAVING' ? '组' : '行'}`);
            button.type = 'button'; button.setAttribute('aria-current', i === active ? 'step' : 'false');
            button.addEventListener('click', () => { stop(); active = i; render(); }); rail.append(button);
        });
        byId('flow-prev').disabled = !stage || active === 0;
        byId('flow-next').disabled = !stage || active === stages.length - 1;
        byId('flow-play').disabled = !stage;
        const detail = byId('flow-detail'); detail.replaceChildren();
        if (!stage) return;
        byId('flow-progress').textContent = `第 ${active + 1} / ${stages.length} 步 · ${stage.name}`;
        const intro = el('div', 'flow-stage-title');
        intro.append(el('h4', '', stage.name), el('code', '', stage.clause), el('p', '', stage.explanation));
        detail.append(intro);
        const surviving = new Set(stage.after.flatMap(r => r.ids));
        const removed = new Set(stage.before.flatMap(r => r.ids).filter(id => !surviving.has(id)));
        const panels = el('div', 'flow-panels');
        const before = el('section', 'flow-data-card');
        before.append(el('h4', '', active ? `输入 · ${stage.before.length} 行 / 组` : '数据来源'));
        if (active) before.append(table(stage.before, removed));
        else before.append(el('p', '', `从 ${stage.clause} 读取下方 JSON 中的示例记录。`));
        const arrow = el('div', 'flow-transfer', '→'); arrow.setAttribute('aria-hidden', 'true');
        const after = el('section', 'flow-data-card flow-output');
        after.append(el('h4', '', `输出 · ${stage.after.length} 行 / 组`), table(stage.after));
        panels.append(before, arrow, after); detail.append(panels);
        detail.append(el('p', 'flow-legend', '来源 #编号贯穿各阶段；同组行号合并表示聚合来源。红色行表示本阶段被过滤或截去。'));
        detail.querySelectorAll('tr[data-source-ids]').forEach(row => {
            row.addEventListener('mouseenter', () => {
                const ids = new Set(row.dataset.sourceIds.split(','));
                detail.querySelectorAll('tr[data-source-ids]').forEach(other => other.classList.toggle('flow-related', other.dataset.sourceIds.split(',').some(id => ids.has(id))));
            });
            row.addEventListener('mouseleave', () => detail.querySelectorAll('.flow-related').forEach(other => other.classList.remove('flow-related')));
        });
    }
    function rebuild() {
        stop(); stages = []; active = 0;
        try {
            const sql = byId('flow-sql').value;
            const raw = byId('flow-data').value;
            if (raw.length > 200000) throw new Error('演示数据过大，请限制在 200 KB 内。');
            stages = SqlFlowDemo.run(SqlVisualizer.parseSql(sql), JSON.parse(raw));
            byId('flow-message').textContent = '演算完成。可点击任意阶段，或播放逐步观察数据变化。';
        } catch (error) {
            byId('flow-message').textContent = `暂未生成数据演示：${error.message} 可修改 SQL / 示例数据后重新演算，或点击“销售聚合示例”。`;
            byId('flow-progress').textContent = '等待示例数据';
        }
        render();
    }
    function view(mode) {
        stop();
        byId('flow-view').hidden = mode !== 'data';
        document.querySelector('#sql-visual-modal .visual-layout').style.display = mode === 'data' ? 'none' : '';
        for (const id of ['visual-zoom-out', 'visual-zoom-in', 'visual-reset', 'visual-fit']) byId(id).hidden = mode === 'data';
        document.querySelector('.visual-animation-toggle').hidden = mode === 'data';
        byId('visual-data-view').setAttribute('aria-pressed', String(mode === 'data'));
        byId('visual-structure-view').setAttribute('aria-pressed', String(mode !== 'data'));
        byId('visual-status').hidden = mode === 'data';
        if (mode === 'structure') requestAnimationFrame(() => byId('visual-fit').click());
    }
    document.addEventListener('DOMContentLoaded', () => {
        byId('visual-data-view').addEventListener('click', () => view('data'));
        byId('visual-structure-view').addEventListener('click', () => view('structure'));
        byId('flow-sample').addEventListener('click', () => {
            byId('flow-sql').value = SqlFlowDemo.sampleSql;
            byId('flow-data').value = JSON.stringify(SqlFlowDemo.sampleData, null, 2);
            byId('flow-origin').textContent = '当前演示：内置销售聚合 SQL（主输入框未修改）';
            rebuild();
        });
        byId('flow-current').addEventListener('click', () => {
            if (!currentModel) return;
            byId('flow-sql').value = currentModel.sql;
            const data = Object.create(null);
            currentModel.branches.forEach(b => b.tables.forEach(t => { data[t.name] = []; }));
            byId('flow-data').value = JSON.stringify(data, null, 2);
            byId('flow-origin').textContent = '当前演示：输入框 SQL · 请填入对应表的示例记录';
            document.querySelector('.flow-source').open = true;
            stop(); stages = []; render();
            byId('flow-message').textContent = '已带入当前 SQL 和表名。填入示例行后点击“重新演算”。';
            byId('flow-progress').textContent = '等待示例数据';
        });
        byId('flow-rebuild').addEventListener('click', rebuild);
        for (const id of ['flow-sql', 'flow-data']) byId(id).addEventListener('input', () => {
            byId('flow-origin').textContent = '当前演示：已编辑的 SQL / 示例数据';
            stop(); stages = []; render(); byId('flow-progress').textContent = '待重新演算';
            byId('flow-message').textContent = 'SQL 或数据已修改，请点击“重新演算”。';
        });
        byId('flow-prev').addEventListener('click', () => { stop(); active--; render(); });
        byId('flow-next').addEventListener('click', () => { stop(); active++; render(); });
        byId('flow-play').addEventListener('click', () => {
            if (timer) { stop(); return; }
            if (active === stages.length - 1) active = 0;
            render(); byId('flow-play').textContent = 'Ⅱ 暂停';
            timer = setInterval(() => { if (active >= stages.length - 1) { stop(); return; } active++; render(); }, 1800);
        });
    });
    window.SqlFlowUI = {
        open(model) {
            currentModel = model;
            byId('flow-sql').value = SqlFlowDemo.sampleSql;
            byId('flow-data').value = JSON.stringify(SqlFlowDemo.sampleData, null, 2);
            byId('flow-origin').textContent = '当前演示：内置销售聚合 SQL（主输入框未修改）';
            document.querySelector('.flow-source').open = false;
            view('data'); rebuild();
        },
        stop,
        error() { currentModel = null; view('structure'); }
    };
})();
