const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const nav = fs.readFileSync(path.join(root, 'nav.js'), 'utf8');
const home = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
const development = fs.readFileSync(path.join(root, 'DEVELOPMENT.md'), 'utf8');

function parseRegisteredTools(source) {
    const toolsBlock = source.match(/const tools = \[([\s\S]*?)\];/);
    assert.ok(toolsBlock, 'nav.js should define a tools array');

    const tools = [...toolsBlock[1].matchAll(/\{\s*name:\s*'([^']+)'\s*,\s*path:\s*'([^']+)'/g)]
        .map((match) => ({ name: match[1], path: match[2] }));

    assert.ok(tools.length > 0, 'nav.js should register at least one tool');
    return tools;
}

const tools = parseRegisteredTools(nav);
const nonHomeTools = tools.filter((tool) => tool.path !== 'index.html');
const expectedLeadingPaths = [
    'index.html',
    'json-parser.html',
    'text-case-converter.html',
    'text_escape_formatter_final.html',
    'text-splitter.html',
    'regex-tester.html',
    'timestamp-converter.html',
];
assert.deepStrictEqual(
    tools.slice(0, expectedLeadingPaths.length).map((tool) => tool.path),
    expectedLeadingPaths,
    'nav.js should put the main text tools first, then keep the other tools in their existing order'
);
assert.match(nav, /className = 'nav-expand-toggle'/);
assert.match(nav, /aria-expanded/);
assert.match(nav, /nav\.classList\.toggle\('expanded'/);

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
