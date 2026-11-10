// Run with playwright-cli run-code --filename tests/browser/json-fault-chain-list.js
async (page) => {
    const baseUrl = 'http://127.0.0.1:5218';
    const response = await page.request.get(baseUrl + '/tests/fixtures/fault-chain-list.json');
    if (!response.ok()) throw Error('Could not load local FaultChain fixture');
    const { sample, signal } = await response.json();
    await page.goto(baseUrl + '/json-parser.html');
    const input = page.getByRole('textbox', { name: 'JSON 源码编辑器', exact: true });
    for (const text of [sample, 'json格式化错误：' + sample]) {
        await input.fill(text);
        await page.getByRole('button', { name: '⚡ 格式化', exact: true }).click();
        await page.locator('#json-output .json-node').first().waitFor({ state: 'visible' });
        await page.getByRole('button', { name: '✏️ 编辑', exact: true }).click();
        const parsed = JSON.parse(await input.inputValue());
        if (parsed.length !== 1 || parsed[0].faultPoints.length !== 7) throw Error('FaultChain list lost records');
        const [first, second] = parsed[0].faultPoints;
        if (first.additionalInfo.dbAdditionalInfoKeyServerEventSignals !== signal) throw Error('Description was modified');
        if (second.additionalInfo.ip !== '::ffff:192.0.2.130' || JSON.stringify(second.additionalInfo.events) !== '["POLLIN"]') throw Error('IPv6 or events changed');
        if (first.apis !== '[]' || first.enabled !== 'true' || first.maskable !== false || first.threshold !== 3) throw Error('Value types changed');
    }
}
