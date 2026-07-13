const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const nav = fs.readFileSync(path.join(root, 'nav.js'), 'utf8');
const navCss = fs.readFileSync(path.join(root, 'nav.css'), 'utf8');
const home = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
const development = fs.readFileSync(path.join(root, 'DEVELOPMENT.md'), 'utf8');

function parseRegisteredTools(source) {
    const toolsBlock = source.match(/const tools = \[([\s\S]*?)\];/);
    assert.ok(toolsBlock, 'nav.js should define a tools array');

    const tools = [...toolsBlock[1].matchAll(/\{\s*name:\s*'([^']+)'\s*,\s*path:\s*'([^']+)'\s*,\s*icon:\s*'([^']+)'/g)]
        .map((match) => ({ name: match[1], path: match[2], icon: match[3] }));

    assert.ok(tools.length > 0, 'nav.js should register at least one tool');
    return tools;
}

const tools = parseRegisteredTools(nav);
const nonHomeTools = tools.filter((tool) => tool.path !== 'index.html');
const toolByPath = new Map(tools.map((tool) => [tool.path, tool]));
const expectedLeadingPaths = [
    'index.html',
    'json-parser.html',
    'text-case-converter.html',
    'regex-tester.html',
    'text_escape_formatter_final.html',
    'text-splitter.html',
    'cron-parser.html',
    'html-formatter.html',
    'timestamp-converter.html',
];
assert.deepStrictEqual(
    tools.slice(0, expectedLeadingPaths.length).map((tool) => tool.path),
    expectedLeadingPaths,
    'nav.js should put the main text tools first, then keep the other tools in their existing order'
);
assert.match(nav, /className = 'nav-expand-toggle'/);
assert.match(nav, /window\.DevToolsRegistry = Object\.freeze/);
assert.match(nav, /navScript\?\.dataset\.registryOnly === 'true'/);
assert.match(nav, /iconElement\.textContent = tool\.icon/);
assert.match(nav, /a\.append\(iconElement, labelElement\)/);
assert.match(navCss, /\.nav-link-icon\s*\{/);
assert.match(nav, /aria-expanded/);
assert.match(nav, /nav\.classList\.toggle\('expanded'/);
assert.match(nav, /linksDiv\.addEventListener\('wheel'/);
assert.match(nav, /scrollLeft \+= event\.deltaY/);
assert.match(nav, /document\.body\.classList\.toggle\('nav-expanded'/);
assert.match(nav, /NAV_CONFIG_STORAGE_KEY = 'dev-tools-nav-config-v1'/);
assert.match(nav, /NAV_HTML_FORMATTER_MIGRATION_KEY = 'dev-tools-nav-html-formatter-default-v1'/);
assert.match(nav, /NAV_PRIMARY_ORDER_MIGRATION_KEY = 'dev-tools-nav-primary-order-v1'/);
assert.match(nav, /function migrateHtmlFormatterDefault/);
assert.match(nav, /orderedPaths\.splice\(insertIndex, 0, 'html-formatter\.html'\)/);
assert.match(nav, /window\.localStorage\.setItem\(NAV_HTML_FORMATTER_MIGRATION_KEY, '1'\)/);
assert.match(nav, /function migratePrimaryDefaultOrder/);
assert.match(nav, /const isLegacyDefault = legacyDefaultPaths\.length === normalized\.orderedPaths\.length/);
assert.match(nav, /function migrateNewTools\(config, initializeOnly = false\)/);
assert.match(nav, /const newPaths = currentPaths\.filter\(path => !knownPathSet\.has\(path\)\)/);
assert.match(nav, /orderedPaths: \[\.\.\.normalized\.orderedPaths, \.\.\.newPaths\]/);
assert.match(nav, /knownPaths: currentPaths/);
assert.match(nav, /const isLegacyConfig = Boolean\(rawConfig\) && !Array\.isArray\(config\.knownPaths\)/);
assert.match(nav, /return migrateNewTools\(migrated, isLegacyConfig\)/);
assert.match(nav, /function loadNavConfig/);
assert.match(nav, /function saveNavConfig/);
assert.match(nav, /function renderNavManager/);
assert.match(nav, /type = 'checkbox'/);
assert.match(nav, /nav-manager-item/);
assert.match(nav, /nav-manager-drag/);
assert.match(nav, /function reorderDraggedPath/);
assert.match(nav, /let activeDraggedPath = ''/);
assert.match(nav, /activeDraggedPath = tool\.path/);
assert.match(nav, /reorderDraggedPath\(activeDraggedPath, targetItem\.dataset\.path, insertAfterTarget, list\)/);
assert.match(nav, /pointerdown/);
assert.match(nav, /pointermove/);
assert.match(nav, /pointerup/);
assert.match(nav, /window\.addEventListener\('pointermove', handlePointerMove, true\)/);
assert.match(nav, /window\.addEventListener\('pointerup', finishPointerDrag, true\)/);
assert.match(nav, /window\.addEventListener\('pointercancel', finishPointerDrag, true\)/);
assert.match(nav, /window\.removeEventListener\('pointermove', handlePointerMove, true\)/);
assert.doesNotMatch(nav, /setPointerCapture/);
assert.doesNotMatch(nav, /lostpointercapture/);
assert.match(nav, /event\.pointerType === 'mouse' && \(event\.buttons & 1\) === 0/);
assert.match(nav, /function updateDraggedItemPosition/);
assert.match(nav, /function getPointerReorderTarget/);
assert.match(nav, /clientY < targetRect\.top \+ targetRect\.height \/ 2/);
assert.doesNotMatch(nav, /document\.elementFromPoint/);
assert.doesNotMatch(nav, /dragstart/);
assert.doesNotMatch(nav, /dragover/);
assert.match(nav, /list\.insertBefore\(draggedItem, nextSibling\)/);
assert.match(navCss, /touch-action:\s*none/);
assert.match(navCss, /\.nav-manager-item\.dragging\s*\{[^}]*z-index:/s);
assert.match(nav, /cubic-bezier\(0\.2, 0, 0, 1\)/);
assert.doesNotMatch(nav, /textContent = '上移'/);
assert.doesNotMatch(nav, /textContent = '下移'/);
assert.match(nav, /恢复默认/);
assert.doesNotMatch(nav, /placeholder = '.*链接/);

const homeToolOrder = [...home.matchAll(/<a\s+href="([^"]+)"\s+class="tool-card"/g)].map((match) => match[1]);
assert.match(home, /<script src="nav\.js" defer data-registry-only="true"><\/script>/);
assert.match(home, /function syncHomeToolIcons\(\)/);
assert.match(home, /iconElement\.textContent = tool\.icon/);
assert.strictEqual(toolByPath.get('text_escape_formatter_final.html').icon, '↔️');
assert.strictEqual(toolByPath.get('sql-formatter.html').icon, '🧾');
assert.notStrictEqual(
    toolByPath.get('text_escape_formatter_final.html').icon,
    toolByPath.get('sql-formatter.html').icon,
    'text escape and SQL formatter should use different icons'
);
assert.strictEqual(toolByPath.get('hash-generator.html').icon, '#️⃣');
assert.notStrictEqual(
    toolByPath.get('regex-tester.html').icon,
    toolByPath.get('hash-generator.html').icon,
    'regex tester and hash generator should use different icons'
);
assert.strictEqual(
    (home.match(/<span class="tool-icon" aria-hidden="true"><\/span>/g) || []).length,
    nonHomeTools.length,
    'all home cards should receive their icons from the shared registry'
);
const expectedHomeLeadingPaths = [
    'json-parser.html',
    'text-case-converter.html',
    'regex-tester.html',
    'text_escape_formatter_final.html',
    'text-splitter.html',
    'cron-parser.html',
    'html-formatter.html',
    'timestamp-converter.html',
];
assert.match(home, /\.tools-grid\s*\{[^}]*grid-template-columns:\s*repeat\(5, minmax\(0, 1fr\)\)[^}]*max-width:\s*1500px/s);
assert.match(home, /@media \(max-width: 1200px\)[\s\S]*?\.tools-grid\s*\{[^}]*grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/);
assert.match(home, /@media \(max-width: 760px\)[\s\S]*?\.tools-grid\s*\{[^}]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
assert.match(home, /@media \(max-width: 480px\)[\s\S]*?\.tools-grid\s*\{[^}]*grid-template-columns:\s*1fr/);
assert.deepStrictEqual(
    homeToolOrder.slice(0, expectedHomeLeadingPaths.length),
    expectedHomeLeadingPaths,
    'index.html should use the same leading tool order as the default navigation'
);

const neonDist = fs.readFileSync(path.join(root, 'neon-timer', 'dist', 'index.html'), 'utf8');
assert.match(neonDist, /<link rel="stylesheet" href="\.\.\/\.\.\/nav\.css">/);

for (const tool of nonHomeTools) {
    assert.match(
        home,
        new RegExp(`<a\\s+href="${tool.path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"\\s+class="tool-card"`),
        `index.html is missing a card for ${tool.name} (${tool.path})`
    );
}

for (const tool of tools) {
    assert.ok(
        readme.includes(tool.path),
        `README.md is missing ${tool.name} path: ${tool.path}`
    );
    assert.ok(
        development.includes(tool.path),
        `DEVELOPMENT.md is missing ${tool.name} path: ${tool.path}`
    );
}

console.log('tool registry consistency passed');
