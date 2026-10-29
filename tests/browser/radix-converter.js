// Run with playwright-cli run-code --filename tests/browser/radix-converter.js
async (page) => {
    await page.goto('http://127.0.0.1:5219/radix-converter.html');
    const input = page.getByRole('textbox', { name: '输入整数', exact: true });
    const convert = page.getByRole('button', { name: '开始转换', exact: true });
    const read = async index => {
        await page.waitForFunction(() => document.querySelector('#status').getAttribute('aria-busy') !== 'true');
        return page.locator('#result-' + index).inputValue();
    };
    const expect = (actual, expected) => { if (actual !== expected) throw Error(JSON.stringify({ actual, expected })); };
    await convert.click();
    if (!(await page.locator('#status').innerText()).includes('请输入')) throw Error('Missing empty-input feedback');
    await page.getByRole('button', { name: '加载示例', exact: true }).click();
    expect(await read(3), 'FF\n-400\n20000000000001');
    expect(await read(2), '255\n-1024\n9007199254740993');
    await page.getByLabel('输出进制前缀', { exact: true }).check();
    expect(await read(3), '0xFF\n-0x400\n0x20000000000001');
    await page.getByLabel('字母大写', { exact: true }).uncheck();
    expect((await read(3)).split('\n')[0], '0xff');
    await page.getByRole('button', { name: '十六进制 HEX回填输入', exact: true }).click();
    expect(await page.getByLabel('输入进制', { exact: true }).inputValue(), '16');
    expect(await read(2), '255\n-1024\n9007199254740993');
    await page.getByLabel('输入进制', { exact: true }).selectOption('custom');
    if (!(await page.locator('#custom-source').isVisible())) throw Error('Custom input base hidden');
    await page.locator('#custom-source').fill('36');
    await input.fill('ZZ\n-10');
    expect(await read(2), '1295\n-36');
    expect(await page.locator('.result-card').count(), 4);
    expect(await page.locator('#target-base').count(), 0);
    await page.getByLabel('输入进制', { exact: true }).selectOption('2');
    await input.fill('10\n\n102\n11');
    expect(await read(2), '2\n⚠ 第 3 行无效\n3');
    if (!(await page.getByRole('button', { name: '复制全部结果', exact: true }).isDisabled())) throw Error('Invalid result copy enabled');
    if (!(await page.locator('#status').innerText()).includes('第 3 行')) throw Error('Missing line error');
    await page.getByLabel('输入进制', { exact: true }).selectOption('custom');
    await page.locator('#custom-source').fill('37');
    expect(await read(0), '');
    if (!(await page.locator('#status').innerText()).includes('2–36')) throw Error('Missing base validation');
    await page.getByLabel('输入进制', { exact: true }).selectOption('16');
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.evaluate(() => navigator.clipboard.writeText('FF\n10'));
    await page.getByRole('button', { name: '📋 粘贴并转换', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('#result-2').value === '255\n16');
    expect(await read(2), '255\n16');
    await page.getByRole('button', { name: '复制十进制 DEC', exact: true }).click();
    await page.waitForFunction(async () => (await navigator.clipboard.readText()).replace(/\r\n/g, '\n') === '255\n16');
    expect((await page.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/g, '\n'), '255\n16');
    await page.getByRole('button', { name: 'V1.02 ℹ️', exact: true }).click();
    if (!(await page.getByRole('heading', { name: '🚀 版本更新说明' }).isVisible())) throw Error('Changelog not visible');
    await page.getByRole('button', { name: '关闭版本更新说明', exact: true }).click();
    await page.getByLabel('输入进制', { exact: true }).selectOption('10');
    await input.fill('1');
    await input.fill('256');
    expect(await read(2), '256');
    await input.fill('999');
    await page.getByRole('button', { name: '清空', exact: true }).click();
    await page.waitForTimeout(250);
    expect(await read(2), '');
    if (!(await page.getByRole('button', { name: '复制全部结果', exact: true }).isDisabled())) throw Error('Clear left stale output');
    for (const width of [1440, 768, 375]) {
        await page.setViewportSize({ width, height: 900 });
        await page.evaluate(() => {
            if (document.documentElement.scrollWidth > innerWidth + 1) throw Error('Page horizontal overflow');
            for (const el of document.querySelectorAll('.radix-tool button, .radix-tool textarea')) {
                const rect = el.getBoundingClientRect();
                if (rect.left < 0 || rect.right > innerWidth + 1) throw Error('Control clipped');
            }
        });
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.getByRole('button', { name: '加载示例', exact: true }).click();
    await page.goto('http://127.0.0.1:5219/index.html');
    await page.locator('.tool-card[href="radix-converter.html"]').click();
    expect(await page.title(), '进制转换工具');
    await page.evaluate(() => {
        const knownPaths = window.DevToolsRegistry.map(tool => tool.path).filter(path => !['index.html', 'radix-converter.html'].includes(path));
        localStorage.setItem('dev-tools-nav-config-v1', JSON.stringify({ orderedPaths: ['json-parser.html'], knownPaths }));
        for (const key of ['dev-tools-nav-html-formatter-default-v1', 'dev-tools-nav-primary-order-v1', 'dev-tools-nav-sql-after-nginx-v1']) localStorage.setItem(key, '1');
    });
    await page.reload();
    if (!(await page.getByRole('link', { name: '进制转换', exact: true }).isVisible())) throw Error('New tool not added to saved navigation');
    await page.evaluate(() => localStorage.removeItem('dev-tools-nav-config-v1'));
    await page.reload();
    await page.getByRole('button', { name: '加载示例', exact: true }).click();
}
