const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const sql = require(path.join(root, 'sql-formatter.js'));

const formatted = sql.formatSql('select id,name from users where id=? and status=:status order by created_at desc');
assert.match(formatted, /SELECT\s+id,/);
assert.match(formatted, /\nFROM users/);
assert.match(formatted, /\nWHERE id = \?/);
assert.match(formatted, /\n  AND status = :status/);
assert.match(formatted, /\nORDER BY created_at DESC/);

assert.strictEqual(
    sql.compressSql('select *\nfrom users\nwhere id = ?  -- only one\n'),
    'select * from users where id = ?'
);

assert.deepStrictEqual(
    sql.extractTableNames('select * from users u join orders o on u.id=o.user_id; update account set name=?; insert into audit_log(id) values (?)'),
    ['users', 'orders', 'account', 'audit_log']
);

assert.deepStrictEqual(
    sql.extractPlaceholders('where id = ? and name = :name and code = ${code} and age = #{age} and tag = $1 and value::text = :value'),
    ['?', ':name', '${code}', '#{age}', '$1', ':value']
);

const page = fs.readFileSync(path.join(root, 'sql-formatter.html'), 'utf8');
assert.match(page, /<title>SQL 格式化\/压缩工具<\/title>/);
assert.match(page, /<script src="sql-formatter\.js"><\/script>/);
assert.match(page, /<span>V1\.00<\/span>/);
assert.match(page, /<div class="changelog-date">2026年7月11日<\/div>[\s\S]*?<div class="changelog-version">V1\.00<\/div>/);
assert.match(page, /id="sql-input"/);
assert.match(page, /id="format-btn"/);
assert.match(page, /id="compress-btn"/);
assert.match(page, /id="table-output"/);
assert.match(page, /id="placeholder-output"/);
assert.match(page, /SqlFormatter\.formatSql/);

const nav = fs.readFileSync(path.join(root, 'nav.js'), 'utf8');
const home = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
const development = fs.readFileSync(path.join(root, 'DEVELOPMENT.md'), 'utf8');
assert.match(nav, /name: 'SQL 格式化', path: 'sql-formatter\.html'/);
assert.match(home, /href="sql-formatter\.html"/);
assert.match(readme, /sql-formatter\.html/);
assert.match(development, /sql-formatter\.html/);

console.log('sql formatter behavior passed');
