const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const { BROWSER_SMOKE_PAGES } = require(path.join(root, 'browser-smoke-manifest.js'));

assert.ok(BROWSER_SMOKE_PAGES.length >= 8, 'browser smoke should cover the main tools');

for (const page of BROWSER_SMOKE_PAGES) {
    const filePath = path.join(root, page.path);
    assert.ok(fs.existsSync(filePath), `${page.path} should exist`);
    const html = fs.readFileSync(filePath, 'utf8');
    assert.match(html, /<script src="nav\.js" defer><\/script>/, `${page.path} should include shared nav`);
    assert.match(html, new RegExp(`<title>${page.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}<\\/title>`), `${page.path} should have expected title`);
    for (const marker of page.markers) {
        assert.ok(html.includes(marker), `${page.path} is missing smoke marker: ${marker}`);
    }
}

async function runRealBrowserSmoke() {
    let chromium;
    try {
        ({ chromium } = require('playwright'));
    } catch (error) {
        throw new Error('RUN_BROWSER_SMOKE=1 requires playwright to be installed');
    }

    const browser = await chromium.launch();
    const page = await browser.newPage();
    try {
        for (const item of BROWSER_SMOKE_PAGES) {
            await page.goto(`file://${path.join(root, item.path).replace(/\\/g, '/')}`);
            await page.locator('body').waitFor({ state: 'visible', timeout: 5000 });
            await page.locator('#shared-nav').waitFor({ state: 'visible', timeout: 5000 });
            for (const selector of item.selectors) {
                await page.locator(selector).first().waitFor({ state: 'visible', timeout: 5000 });
            }
        }
    } finally {
        await browser.close();
    }
}

if (process.env.RUN_BROWSER_SMOKE === '1') {
    runRealBrowserSmoke()
        .then(() => console.log('real browser smoke passed'))
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
} else {
    console.log('browser smoke static checks passed; set RUN_BROWSER_SMOKE=1 to run Playwright checks');
}
