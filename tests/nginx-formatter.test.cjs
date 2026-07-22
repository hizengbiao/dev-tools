const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const formatter = require(path.join(root, 'nginx-formatter.js'));

const quoted = 'set $value "# not a comment; { }"; # real comment';
const tokens = formatter.tokenizeNginx(quoted);
assert.strictEqual(tokens.filter(token => token.type === 'comment').length, 1);
assert.strictEqual(tokens.find(token => token.type === 'string').value, '"# not a comment; { }"');
assert.ok(formatter.tokenizeNginx('set $value foo\\ bar;').some(token => token.value === 'foo\\ bar'));

const nested = 'http { server { listen 80; } }';
assert.deepStrictEqual(
    formatter.analyzeNginx(nested),
    {
        tokens: formatter.tokenizeNginx(nested),
        directiveCount: 1,
        blockCount: 2,
        commentCount: 0,
        maxDepth: 2,
        issues: [],
    }
);

const unmatchedClose = formatter.analyzeNginx('server { listen 80; }}').issues;
assert.strictEqual(unmatchedClose[0].code, 'unexpected-closing-brace');
assert.deepStrictEqual(
    { line: unmatchedClose[0].line, column: unmatchedClose[0].column },
    { line: 1, column: 22 }
);

assert.match(
    formatter.analyzeNginx('server {\n    listen 80;').issues.map(issue => issue.code).join(','),
    /unclosed-block/
);
assert.strictEqual(formatter.analyzeNginx('listen 80').issues[0].code, 'missing-semicolon');
assert.strictEqual(formatter.analyzeNginx('set $x "abc').issues[0].code, 'unclosed-quote');
assert.strictEqual(formatter.analyzeNginx('{ listen 80; }').issues[0].code, 'missing-block-header');
assert.strictEqual(formatter.analyzeNginx(';').issues[0].code, 'empty-directive');
assert.deepStrictEqual(formatter.analyzeNginx('# comment only').issues, []);

const compact = 'http{server{listen 80;location /api {proxy_pass "http://upstream/#v1";}}}';
const expected = [
    'http {',
    '    server {',
    '        listen 80;',
    '        location /api {',
    '            proxy_pass "http://upstream/#v1";',
    '        }',
    '    }',
    '}',
].join('\n');
assert.strictEqual(formatter.formatNginx(compact).formatted, expected);
assert.strictEqual(formatter.formatNginx(expected).formatted, expected);

const comments = [
    '# global comment',
    'events { # block comment',
    'worker_connections 1024; # directive comment',
    '# inside comment',
    '}',
].join('\n');
assert.strictEqual(
    formatter.formatNginx(comments).formatted,
    [
        '# global comment',
        'events { # block comment',
        '    worker_connections 1024; # directive comment',
        '    # inside comment',
        '}',
    ].join('\n')
);

assert.strictEqual(
    formatter.formatNginx('set $value foo\\ bar;').formatted,
    'set $value foo\\ bar;'
);

const customIndent = formatter.formatNginx('server { listen 80; }', { indentSize: 2 });
assert.strictEqual(customIndent.formatted, 'server {\n  listen 80;\n}');
assert.deepStrictEqual(
    {
        directives: customIndent.directiveCount,
        blocks: customIndent.blockCount,
        comments: customIndent.commentCount,
        depth: customIndent.maxDepth,
    },
    { directives: 1, blocks: 1, comments: 0, depth: 1 }
);

const invalidFormat = formatter.formatNginx('server { listen 80;');
assert.strictEqual(invalidFormat.formatted, '');
assert.ok(invalidFormat.issues.length > 0);
assert.strictEqual(formatter.formatNginx('# comment only').formatted, '# comment only');

const tree = formatter.buildNginxTree(expected);
assert.strictEqual(tree.children[0].type, 'block');
assert.strictEqual(tree.children[0].opening, 'http {');
assert.strictEqual(tree.children[0].line, 1);
assert.strictEqual(tree.children[0].closingLine, 8);
assert.strictEqual(tree.children[0].children[0].opening, 'server {');
assert.strictEqual(tree.children[0].children[0].children[0].type, 'directive');
assert.strictEqual(tree.children[0].children[0].children[0].value, 'listen 80;');
assert.strictEqual(tree.children[0].children[0].children[1].children[0].line, 5);

const commentTree = formatter.buildNginxTree('# comment\nevents {\n    worker_connections 1024;\n}');
assert.strictEqual(commentTree.children[0].type, 'comment');
assert.strictEqual(commentTree.children[1].type, 'block');
assert.deepStrictEqual(
    formatter.splitInlineComment('server { # HTTPS 服务'),
    { content: 'server { ', comment: '# HTTPS 服务' }
);
assert.deepStrictEqual(
    formatter.splitInlineComment('set $value "part#name"; # 行尾注释'),
    { content: 'set $value "part#name"; ', comment: '# 行尾注释' }
);
assert.deepStrictEqual(
    formatter.splitInlineComment('set $value "part#name";'),
    { content: 'set $value "part#name";', comment: '' }
);

const editableConfig = 'http {\n    server {\n        listen 80;\n    }\n}';
const editableBlock = formatter.buildNginxTree(editableConfig).children[0].children[0];
assert.strictEqual(formatter.getNodeSource(editableConfig, editableBlock), '    server {\n        listen 80;\n    }');
assert.strictEqual(
    formatter.replaceNodeSource(editableConfig, editableBlock, '    server {\n        listen 8080;\n    }'),
    'http {\n    server {\n        listen 8080;\n    }\n}'
);
assert.strictEqual(formatter.removeNodeSource(editableConfig, editableBlock), 'http {\n}');

const commentedClosingConfig = [
    'http {',
    '    server { # HTTPS 服务',
    '        location /api {',
    '            proxy_pass http://backend;',
    '        } # API 代理',
    '    }',
    '}'
].join('\n');
const commentedClosingTree = formatter.buildNginxTree(commentedClosingConfig);
const commentedServer = commentedClosingTree.children[0].children[0];
const commentedLocation = commentedServer.children[0];
assert.strictEqual(commentedLocation.closing, '} # API 代理');
assert.strictEqual(commentedLocation.closingLine, 5);
assert.strictEqual(commentedServer.closingLine, 6);
assert.strictEqual(
    formatter.getNodeSource(commentedClosingConfig, commentedLocation),
    '        location /api {\n            proxy_pass http://backend;\n        } # API 代理'
);

const serverSummaryTree = formatter.buildNginxTree([
    'server {',
    '    listen 80;',
    '    server_name example.com www.example.com; # production domains',
    '    location / {',
    '        try_files $uri /index.html;',
    '    }',
    '}'
].join('\n'));
assert.strictEqual(
    formatter.getCollapsedBlockLabel(serverSummaryTree.children[0]),
    'example.com www.example.com'
);
assert.strictEqual(
    formatter.getCollapsedBlockLabel(serverSummaryTree.children[0].children[2]),
    ''
);
assert.strictEqual(
    formatter.getCollapsedBlockLabel(formatter.buildNginxTree('server {\n    listen 80;\n}').children[0]),
    ''
);

const page = fs.readFileSync(path.join(root, 'nginx-formatter.html'), 'utf8');
assert.match(page, /<title>Nginx 配置格式化工具<\/title>/);
assert.match(page, /<script src="nav\.js" defer><\/script>/);
assert.match(page, /<script src="changelog\.js"><\/script>/);
assert.match(page, /<script src="clipboard-utils\.js"><\/script>/);
assert.match(page, /<script src="editor-lines\.js"><\/script>/);
assert.match(page, /<script src="nginx-formatter\.js"><\/script>/);
[
    'nginx-input', 'nginx-output', 'nginx-tree-output', 'paste-format-btn', 'format-btn', 'edit-btn', 'copy-btn',
    'expand-all-btn', 'collapse-all-btn', 'clear-btn', 'sample-btn', 'status-message', 'issue-list',
].forEach(id => assert.match(page, new RegExp(`id="${id}"`)));
[
    'source-tab', 'result-tab', 'directive-count', 'block-count', 'comment-count', 'max-depth',
].forEach(id => assert.doesNotMatch(page, new RegExp(`id="${id}"`)));
assert.match(page, /const NGINX_INDENT_SIZE = 4;/);
assert.match(page, /NginxFormatter\.formatNginx/);
assert.match(page, /async function pasteAndFormat\(\)/);
assert.match(page, /navigator\.clipboard\.readText\(\)/);
assert.match(page, /<button id="paste-format-btn"[^>]*>📋 粘贴并格式化<\/button>/);
assert.match(page, /<button id="format-btn"[^>]*>⚡ 格式化<\/button>/);
assert.match(page, /<button id="edit-btn"[^>]*>✏️ 编辑源码<\/button>/);
assert.match(page, /<button id="copy-btn"[^>]*>📋 复制结果<\/button>/);
assert.match(page, /<button id="expand-all-btn"[^>]*>📖 展开全部<\/button>/);
assert.match(page, /<button id="collapse-all-btn"[^>]*>📕 收起全部<\/button>/);
assert.match(page, /<button id="clear-btn"[^>]*>🧹 清空<\/button>/);
assert.match(page, /<button id="sample-btn"[^>]*>🧪 加载示例<\/button>/);
assert.match(page, /\.page-shell\s*\{[^}]*max-width:\s*1800px;/s);
assert.match(page, /\.main-actions\s*\{[^}]*padding-left:\s*52px;/s);
assert.match(page, /@media \(max-width: 760px\)[\s\S]*?\.main-actions\s*\{[^}]*padding-left:\s*0;/);
assert.match(page, /NginxFormatter\.buildNginxTree/);
assert.match(page, /function renderTree\(value\)/);
assert.match(page, /function createTreeBlock\(node, depth\)/);
assert.match(page, /function appendSyntaxText\(element, value\)/);
assert.match(page, /className = 'nginx-inline-comment'/);
assert.match(page, /function createBlockActions\(node, wrapper\)/);
['复制区块', '折叠子树', '编辑区块', '删除区块'].forEach(label => assert.match(page, new RegExp(label)));
assert.match(page, /\.nginx-block-actions\s*\{[\s\S]*?opacity:\s*0;/);
assert.match(page, /\.nginx-tree-row:hover\s*>\s*\.nginx-block-actions/);
assert.match(page, /\.nginx-tree-row:focus-within\s*>\s*\.nginx-block-actions/);
assert.match(page, /function editTreeBlock\(node, wrapper\)/);
assert.match(page, /className = 'nginx-subtree-editor'/);
assert.match(page, /textarea\.setSelectionRange\(0, 0\)/);
assert.match(page, /textarea\.scrollTop = 0/);
assert.match(page, /function deleteTreeBlock\(node\)/);
assert.match(page, /function setAllBlocksCollapsed\(collapsed\)/);
assert.match(page, /className = 'nginx-tree-line-number'/);
assert.match(page, /className = 'nginx-tree-collapsed-closing'/);
assert.match(page, /NginxFormatter\.getCollapsedBlockLabel\(node\)/);
assert.match(page, /className = 'nginx-tree-server-name'/);
assert.match(page, /NginxFormatter\.splitInlineComment\(node\.closing\)\.content\.trimEnd\(\)/);
assert.match(page, /row\.appendChild\(collapsedClosing\)/);
assert.doesNotMatch(page, /collapsedClosing\.appendChild\(createTreeLineNumber/);
assert.match(page, /\.nginx-tree-node\.collapsed\s*>\s*\.nginx-tree-row\s*>\s*\.nginx-tree-collapsed-closing\s*\{\s*display:\s*inline-flex;/);
assert.match(page, /\.nginx-tree-node\.collapsed\s*>\s*\.nginx-tree-row\s*>\s*\.nginx-block-header\s+\.nginx-inline-comment\s*\{\s*display:\s*none;/);
assert.match(page, /\.nginx-tree-node\.collapsed\s*>\s*\.nginx-tree-row\s*>\s*\.nginx-block-actions\s*\{\s*order:\s*1;/);
assert.match(page, /document\.getElementById\('sample-btn'\)\.addEventListener\('click',[\s\S]*?input\.dispatchEvent\(new Event\('input'\)\);\s*formatConfiguration\(\);\s*\}\);/);
assert.match(page, /spacer\.className = 'nginx-tree-toggle-spacer'/);
assert.match(page, /\.nginx-tree-children\s*\{[^}]*padding:\s*2px 0 2px 16px;/);
assert.match(page, /\.nginx-tree-node\s*\{[\s\S]*?margin-left:\s*-6px;/);
assert.match(page, /--tree-depth/);
assert.match(page, /<span>V1\.13<\/span>/);
assert.match(page, /<div class="changelog-date">2026年7月23日<\/div>[\s\S]*?<div class="changelog-version">V1\.13<\/div>[\s\S]*?<div class="changelog-date">2026年7月15日<\/div>[\s\S]*?<div class="changelog-version">V1\.12<\/div>[\s\S]*?<div class="changelog-version">V1\.11<\/div>[\s\S]*?<div class="changelog-version">V1\.10<\/div>[\s\S]*?<div class="changelog-version">V1\.09<\/div>[\s\S]*?<div class="changelog-version">V1\.08<\/div>[\s\S]*?<div class="changelog-version">V1\.07<\/div>[\s\S]*?<div class="changelog-version">V1\.06<\/div>[\s\S]*?<div class="changelog-version">V1\.05<\/div>[\s\S]*?<div class="changelog-date">2026年7月14日<\/div>[\s\S]*?<div class="changelog-version">V1\.04<\/div>[\s\S]*?<div class="changelog-version">V1\.03<\/div>[\s\S]*?<div class="changelog-version">V1\.02<\/div>[\s\S]*?<div class="changelog-version">V1\.01<\/div>[\s\S]*?<div class="changelog-version">V1\.00<\/div>/);
assert.match(page, /setOutput\(''\)/);
assert.match(page, /result\.issues\.length/);
assert.match(page, /EditorLines\.refreshLineNumbers/);
assert.match(page, /EditorLines\.syncLineNumberScroll/);

console.log('nginx formatter validation passed');
