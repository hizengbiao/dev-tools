// Run with playwright-cli run-code --filename tests/browser/json-tree-line-wrap.js
async (page) => {
    await page.goto('http://127.0.0.1:5218/json-parser.html');
    await page.getByRole('textbox', { name: 'JSON 源码编辑器', exact: true }).fill(JSON.stringify({
        service: { name: '用于进行JSON超长字段测试，'.repeat(90), enabled: true, ports: [8080, 8443] },
        instances: [{ id: 'node-01', status: 'running' }, { id: 'node-02', status: 'stopped' }]
    }));
    await page.getByRole('button', { name: '⚡ 格式化', exact: true }).click();
    for (const width of [1440, 720, 480]) {
        await page.setViewportSize({ width, height: 900 });
        await page.evaluate(() => {
            const rows = [...document.querySelectorAll('#json-output .json-row')];
            if (!rows.length) throw Error('Missing tree rows');
            let wrapped = false;
            for (const row of rows) {
                const gutter = row.querySelector(':scope > .line-num');
                const content = row.querySelector(':scope > .content-box');
                if (content.getBoundingClientRect().height > 40) wrapped = true;
                if (Math.abs(gutter.getBoundingClientRect().top - content.getBoundingClientRect().top) > 1) throw Error('Tree line number not aligned with first visual line');
            }
            if (!wrapped) throw Error('Missing multiline sample');
            const name = [...document.querySelectorAll('#json-output .key')].find(el => el.textContent === '"name"');
            const range = document.createRange();
            range.selectNodeContents(name);
            const first = range.getClientRects()[0];
            const gutter = name.closest('.json-row').querySelector('.line-num').getBoundingClientRect();
            if (first.top > gutter.bottom || first.bottom < gutter.top) throw Error('Gutter does not overlap first text line');
        });
    }
}
