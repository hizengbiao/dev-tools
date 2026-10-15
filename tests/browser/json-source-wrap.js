// Run with playwright-cli run-code --filename tests/browser/json-source-wrap.js
async (page) => {
    await page.goto('http://127.0.0.1:5218/json-parser.html');
    const input = page.getByRole('textbox', { name: 'JSON 源码编辑器', exact: true });
    const sample = JSON.stringify({ name: '这是一个超长中文名称'.repeat(80), url: 'https://example.com/' + 'a'.repeat(1800), token: 'ABC123'.repeat(800), end: true }, null, 2);
    await input.fill(sample);
    const check = async () => page.evaluate(() => {
        const input = document.querySelector('#json-input');
        const rows = document.querySelectorAll('#view-source .json-source-gutter > div');
        const mirror = document.querySelector('#view-source .json-source-mirror');
        if (input.scrollWidth > input.clientWidth + 1) throw Error('Horizontal overflow');
        if (rows.length !== input.value.split('\n').length) throw Error('Logical line count changed');
        if (rows[3].getBoundingClientRect().height < 40) throw Error('Long token not wrapped');
        for (let i = 0; i < rows.length; i++) {
            if (Math.abs(rows[i].getBoundingClientRect().height - mirror.children[i].getBoundingClientRect().height) > 1) throw Error('Gutter height mismatch');
        }
        return { width: input.clientWidth, height: input.scrollHeight, rows: rows.length };
    });
    await page.waitForTimeout(150);
    console.log(await check());
    if (await input.inputValue() !== sample) throw Error('Soft wrapping changed text');
    await page.setViewportSize({ width: 720, height: 700 });
    await page.waitForTimeout(150);
    console.log(await check());
    const invalid = '{\n"token":"' + 'A'.repeat(2500) + '",\n"bad"：true\n}';
    await input.fill(invalid);
    await page.getByRole('button', { name: '⚡ 格式化', exact: true }).click();
    await page.evaluate(() => {
        const input = document.querySelector('#repair-preview-input');
        const row = document.querySelector('.repair-preview-editor .json-source-gutter .is-error');
        const highlight = document.querySelector('.repair-preview-editor .json-source-error-line');
        if (row?.textContent !== '3') throw Error('Wrong logical error line');
        if (input.value[input.selectionStart] !== '：') throw Error('Wrong error character');
        if (Math.abs(row.getBoundingClientRect().top - highlight.getBoundingClientRect().top) > 1) throw Error('Error highlight misaligned after wrapping');
        if (highlight.getBoundingClientRect().top < input.getBoundingClientRect().top) throw Error('Error not scrolled into view');
    });
    await page.evaluate(() => {
        sourceEditor.markError();
        const row = document.querySelector('#view-source .json-source-gutter .is-error');
        const highlight = document.querySelector('#view-source .json-source-error-line');
        if (row?.textContent !== '3' || Math.abs(row.getBoundingClientRect().top - highlight.getBoundingClientRect().top) > 1) throw Error('Source error highlight misaligned');
    });
    await input.fill('{"token":"' + 'A'.repeat(2500) + '","bad"：true}');
    await page.evaluate(() => {
        sourceEditor.markError();
        const input = document.querySelector('#json-input');
        const highlight = document.querySelector('#view-source .json-source-error-line');
        if (input.value[input.selectionStart] !== '：' || input.scrollTop < 20) throw Error('Wrapped-line error not located');
        const top = highlight.getBoundingClientRect().top;
        const box = input.getBoundingClientRect();
        if (top < box.top || top > box.bottom) throw Error('Wrapped-line error outside editor');
    });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(150);
    await input.fill(sample);
    await page.getByRole('button', { name: '⚡ 格式化', exact: true }).click();
    await page.getByRole('button', { name: '✏️ 编辑', exact: true }).click();
    if (JSON.stringify(JSON.parse(await input.inputValue())) !== JSON.stringify(JSON.parse(sample))) throw Error('Format/edit changed long values');
    console.log('JSON source wrapping browser checks passed');
}
