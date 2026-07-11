const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const manager = require(path.join(root, 'tool-config-manager.js'));

function createStorage(seed = {}) {
    const data = new Map(Object.entries(seed));
    return {
        getItem(key) {
            return data.has(key) ? data.get(key) : null;
        },
        setItem(key, value) {
            data.set(key, String(value));
        },
        removeItem(key) {
            data.delete(key);
        },
        dump() {
            return Object.fromEntries(data.entries());
        },
    };
}

const storage = createStorage({
    'textEscapeFormatter.variableMappings': JSON.stringify([{ left: 'SERVICE_NAME', right: 'SVNM.getName()' }]),
});

const payload = manager.createExportPayload(storage, { exportedAt: '2026-07-11T00:00:00.000Z' });
assert.strictEqual(payload.version, 1);
assert.strictEqual(payload.exportedAt, '2026-07-11T00:00:00.000Z');
assert.deepStrictEqual(payload.configs, [
    {
        id: 'textEscape.variableMappings',
        name: '文本转义变量映射',
        storageKey: 'textEscapeFormatter.variableMappings',
        value: [{ left: 'SERVICE_NAME', right: 'SVNM.getName()' }],
    },
]);

const targetStorage = createStorage();
const result = manager.importConfigPayload({
    version: 1,
    configs: [
        payload.configs[0],
        { id: 'unknown', storageKey: 'unknown.key', value: 'ignored' },
    ],
}, targetStorage);
assert.deepStrictEqual(result, { imported: 1, skipped: 1 });
assert.deepStrictEqual(JSON.parse(targetStorage.getItem('textEscapeFormatter.variableMappings')), [
    { left: 'SERVICE_NAME', right: 'SVNM.getName()' },
]);
assert.strictEqual(targetStorage.getItem('unknown.key'), null);

assert.throws(() => manager.importConfigPayload({ configs: 'bad' }, targetStorage), /configs must be an array/);

const page = fs.readFileSync(path.join(root, 'tool-config-manager.html'), 'utf8');
assert.match(page, /<title>工具配置管理<\/title>/);
assert.match(page, /<script src="tool-config-manager\.js"><\/script>/);
assert.match(page, /id="export-config-btn"/);
assert.match(page, /id="import-config-btn"/);
assert.match(page, /id="config-json"/);
assert.match(page, /ToolConfigManager\.createExportPayload/);

const nav = fs.readFileSync(path.join(root, 'nav.js'), 'utf8');
const home = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
const development = fs.readFileSync(path.join(root, 'DEVELOPMENT.md'), 'utf8');
assert.match(nav, /name: '配置管理', path: 'tool-config-manager\.html'/);
assert.match(home, /href="tool-config-manager\.html"/);
assert.match(readme, /tool-config-manager\.html/);
assert.match(development, /tool-config-manager\.html/);

console.log('tool config manager behavior passed');
