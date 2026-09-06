// Run after opening the local json-parser.html page with playwright-cli:
// playwright-cli run-code --filename tests/browser/json-parser-review.js
async (page) => {
    await page.reload();
    await page.getByRole('textbox', { name: '请在此粘贴 JSON...' }).fill('{"old":{"value":1},"other":2,"fold":{"keep":true},"list":["a","b","c"]}');
    await page.getByRole('button', { name: '⚡ 格式化', exact: true }).click();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    const at = p => page.locator('.json-node[data-path=' + JSON.stringify(JSON.stringify(p)) + ']');
    await page.evaluate(() => { ClipboardUtils.copyText = async text => { window.__copied = text; return true; }; });
    await at(['old']).locator(':scope > .json-row .key').click();
    await page.locator('.edit-input').fill('renamed');
    await page.locator('.edit-input').press('Enter');
    await page.getByRole('button', { name: '✏️ 编辑', exact: true }).hover();
    await page.locator('#path-tooltip').waitFor({ state: 'hidden' });
    await at(['renamed', 'value']).locator('.number').click();
    await page.locator('.edit-input').fill('7');
    await at(['renamed', 'value']).getByRole('button', { name: '复制值', exact: true }).click();
    if (await page.evaluate(() => window.__copied) !== '7') throw Error('copy is stale');
    await at(['renamed']).locator(':scope > .json-row .key').click();
    await page.locator('.edit-input').fill('other');
    await page.locator('.edit-input').press('Enter');
    if (!await at(['renamed']).count()) throw Error('collision removed original key');
    await page.getByRole('button', { name: '✏️ 编辑', exact: true }).hover();
    await page.locator('#path-tooltip').waitFor({ state: 'hidden' });
    await at(['fold']).locator(':scope > .json-row .collapsible-icon').click();
    await at(['list', '0']).getByRole('button', { name: '删除值', exact: true }).click();
    await at(['list', '0']).getByRole('button', { name: '删除值', exact: true }).click();
    if (!await at(['fold']).evaluate(el => el.classList.contains('collapsed'))) throw Error('fold lost');
    await page.getByRole('button', { name: '📦 压缩', exact: true }).click();
    const input = page.getByRole('textbox', { name: '请在此粘贴 JSON...' });
    const actual = JSON.parse(await input.inputValue());
    if (actual.renamed.value !== 7 || actual.other !== 2 || JSON.stringify(actual.list) !== '["c"]') throw Error(JSON.stringify(actual));
    await input.fill('{"text":"a,,b,}c[,d","items":[1,2,],}');
    await page.getByRole('button', { name: '⚡ 格式化', exact: true }).click();
    await page.getByRole('button', { name: '📦 压缩', exact: true }).click();
    if (JSON.parse(await input.inputValue()).text !== 'a,,b,}c[,d') throw Error('string content modified');
    await input.fill('{"__proto__":{"keep":true},"hasOwnProperty":false}');
    await page.getByRole('button', { name: '⚡ 格式化', exact: true }).click();
    await page.getByRole('button', { name: '⬇️ 升序', exact: true }).click();
    await at([]).locator(':scope > .json-row').getByRole('button', { name: '新增属性', exact: true }).click();
    await page.getByRole('button', { name: '📦 压缩', exact: true }).click();
    const special = JSON.parse(await input.inputValue());
    if (!Object.hasOwn(special, '__proto__') || special['新属性1'] !== '新值') throw Error('special key lost');
    await input.fill(JSON.stringify('{"ok":true}'));
    await page.getByRole('button', { name: '⚡ 格式化', exact: true }).click();
    await page.getByRole('button', { name: '展开 JSON 字符串', exact: true }).click();
    await page.getByRole('button', { name: '恢复 JSON 字符串', exact: true }).click();
    await page.getByRole('button', { name: '📦 压缩', exact: true }).click();
    if (JSON.parse(await input.inputValue()) !== '{"ok":true}') throw Error('root string restore failed');

    // Pending textarea input must be captured even before its 500ms history timer.
    await input.fill('{"n":1}');
    await page.getByRole('button', { name: '⚡ 格式化', exact: true }).click();
    await page.getByRole('button', { name: '✏️ 编辑', exact: true }).click();
    await input.fill('{"n":2}');
    await input.press('ControlOrMeta+z');
    if (JSON.parse(await input.inputValue()).n !== 1) throw Error('pending input undo failed');
    await input.press('ControlOrMeta+Shift+z');
    if (JSON.parse(await input.inputValue()).n !== 2) throw Error('shift redo failed');
    await input.press('ControlOrMeta+z');
    await input.fill('{"n":3}');
    await page.getByRole('button', { name: '↪️ 重做', exact: true }).click();
    if (JSON.parse(await input.inputValue()).n !== 3) throw Error('redo replaced new input');
    await page.getByRole('button', { name: '🧹 清空', exact: true }).click();
    await page.getByRole('button', { name: '↩️ 撤销', exact: true }).click();
    if (JSON.parse(await input.inputValue()).n !== 3) throw Error('clear undo failed');
    await page.getByRole('button', { name: '↪️ 重做', exact: true }).click();
    if (await input.inputValue() !== '') throw Error('clear redo failed');

    await input.fill('{"n":0,"m":0}');
    await page.getByRole('button', { name: '⚡ 格式化', exact: true }).click();
    for (const [key, value] of [['n', '1'], ['m', '2']]) {
        await at([key]).locator('.number').click();
        await page.locator('.edit-input').fill(value);
        await page.locator('.edit-input').press('Enter');
    }
    await page.getByRole('button', { name: '↩️ 撤销', exact: true }).click();
    if (await at(['n']).locator('.number').innerText() !== '1' || await at(['m']).locator('.number').innerText() !== '0') throw Error('tree undo skipped a change');
    await page.getByRole('button', { name: '↩️ 撤销', exact: true }).click();
    if (await at(['n']).locator('.number').innerText() !== '0') throw Error('second tree undo failed');
    await at([]).locator(':scope > .json-row').getByRole('button', { name: '编辑值', exact: true }).click();
    const subtree = page.locator('.subtree-textarea');
    await subtree.press('ControlOrMeta+a');
    await subtree.pressSequentially('{"n":8}');
    await subtree.press('ControlOrMeta+z');
    if (!await subtree.isVisible()) throw Error('local undo replaced the entire document');
    await page.getByRole('button', { name: '取消', exact: true }).click();
    await page.getByRole('button', { name: '📦 压缩', exact: true }).click();
    if (JSON.parse(await input.inputValue()).n !== 0) throw Error('cancelled local edit was committed');

    for (const [raw, expected] of [
        ['DTO(url=http://example.com, id=1)', { url: 'http://example.com', id: 1 }],
        ['DTO(message="x:Child{a=1}", ok=true)', { message: 'x:Child{a=1}', ok: true }],
        ["payload={'text':'}','ok':1}", { text: '}', ok: 1 }],
        ['[alpha]', ['alpha']],
        ['[[1,2]];', [[1, 2]]],
        ['[["x"]],', [['x']]],
        ['[TAG]{"ok":1}[/TAG]', { ok: 1 }],
    ]) {
        await input.fill(raw);
        await page.getByRole('button', { name: '⚡ 格式化', exact: true }).click();
        await page.getByRole('button', { name: '📦 压缩', exact: true }).click();
        if (JSON.stringify(JSON.parse(await input.inputValue())) !== JSON.stringify(expected)) throw Error('repair lost data: ' + raw);
    }
    const nestedOriginal = { payload: JSON.stringify({ nested: JSON.stringify({ ok: true }) }) };
    await input.fill(JSON.stringify(nestedOriginal));
    await page.getByRole('button', { name: '⚡ 格式化', exact: true }).click();
    await at(['payload']).getByRole('button', { name: '展开 JSON 字符串', exact: true }).click();
    await at(['payload', 'nested']).getByRole('button', { name: '展开 JSON 字符串', exact: true }).click();
    await at(['payload']).locator(':scope > .json-row').getByRole('button', { name: '恢复 JSON 字符串', exact: true }).click();
    await page.getByRole('button', { name: '📦 压缩', exact: true }).click();
    if (JSON.stringify(JSON.parse(await input.inputValue())) !== JSON.stringify(nestedOriginal)) throw Error('restoring parent changed nested types');
    if (errors.length) throw Error(errors.join('\n'));
    return { passed: 'editing, copy, deletion, pending-input history, local undo, DTO/log repair, nested-string restore', actual, special, pageErrors: errors };
}
