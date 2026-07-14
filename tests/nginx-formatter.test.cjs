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

console.log('nginx formatter validation passed');
