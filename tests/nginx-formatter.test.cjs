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

const page = fs.readFileSync(path.join(root, 'nginx-formatter.html'), 'utf8');
assert.match(page, /<title>Nginx 配置格式化工具<\/title>/);
assert.match(page, /<script src="nav\.js" defer><\/script>/);
assert.match(page, /<script src="clipboard-utils\.js"><\/script>/);
assert.match(page, /<script src="editor-lines\.js"><\/script>/);
assert.match(page, /<script src="nginx-formatter\.js"><\/script>/);
[
    'nginx-input', 'nginx-output', 'format-btn', 'copy-btn', 'clear-btn', 'sample-btn',
    'source-tab', 'result-tab', 'status-message', 'issue-list', 'directive-count',
    'block-count', 'comment-count', 'max-depth',
].forEach(id => assert.match(page, new RegExp(`id="${id}"`)));
assert.match(page, /const NGINX_INDENT_SIZE = 4;/);
assert.match(page, /NginxFormatter\.formatNginx/);
assert.match(page, /setOutput\(''\)/);
assert.match(page, /result\.issues\.length/);
assert.match(page, /EditorLines\.refreshLineNumbers/);
assert.match(page, /EditorLines\.syncLineNumberScroll/);

console.log('nginx formatter validation passed');
