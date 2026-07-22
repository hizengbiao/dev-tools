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
    sql.formatSql('select concat(first_name,last_name), id from users where id in (1,2,3)'),
    'SELECT concat(first_name, last_name),\n  id\nFROM users\nWHERE id IN (1, 2, 3)'
);

assert.strictEqual(
    sql.compressSql('select *\nfrom users\nwhere id = ?  -- only one\n'),
    'select * from users where id = ?'
);

assert.deepStrictEqual(
    sql.extractTableNames('select * from users u join orders o on u.id=o.user_id; update account set name=?; insert into audit_log(id) values (?)'),
    ['users', 'orders', 'account', 'audit_log']
);

const createTableSql = `-- oamrelation.origin_security_strategy definition

CREATE TABLE origin_security_strategy (
  id bigint NOT NULL AUTO_INCREMENT,
  PRIMARY KEY (id),
  UNIQUE KEY unique_index (mip,rule_id)
) ENGINE=InnoDB AUTO_INCREMENT=68248615 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;`;

assert.strictEqual(
    sql.formatSql(createTableSql),
    `-- oamrelation.origin_security_strategy definition
CREATE TABLE origin_security_strategy (
  id bigint NOT NULL AUTO_INCREMENT,
  PRIMARY KEY (id),
  UNIQUE KEY unique_index (mip, rule_id)
) ENGINE = InnoDB
  AUTO_INCREMENT = 68248615
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_bin;`
);

assert.deepStrictEqual(sql.extractTableNames(createTableSql), ['origin_security_strategy']);
assert.deepStrictEqual(
    sql.extractTableNames('CREATE TABLE IF NOT EXISTS `audit_log` (id bigint); ALTER TABLE account ADD COLUMN enabled int'),
    ['audit_log', 'account']
);

assert.deepStrictEqual(
    sql.extractPlaceholders('where id = ? and name = :name and code = ${code} and age = #{age} and tag = $1 and value::text = :value'),
    ['?', ':name', '${code}', '#{age}', '$1', ':value']
);

const page = fs.readFileSync(path.join(root, 'sql-formatter.html'), 'utf8');
assert.match(page, /<title>SQL 格式化\/压缩工具<\/title>/);
assert.match(page, /<script src="sql-formatter\.js"><\/script>/);
assert.match(page, /<span>V1\.01<\/span>/);
assert.match(page, /<script src="editor-lines\.js"><\/script>/);
assert.match(page, /id="input-lines"/);
assert.match(page, /id="output-lines"/);
assert.match(page, /EditorLines\.refreshLineNumbers/);
assert.match(page, /EditorLines\.syncLineNumberScroll/);
assert.match(page, /<div class="changelog-date">2026年7月11日<\/div>[\s\S]*?<div class="changelog-version">V1\.00<\/div>/);
assert.match(page, /<div class="changelog-date">2026年7月22日<\/div>[\s\S]*?<div class="changelog-version">V1\.01<\/div>/);
assert.match(page, /id="sql-input"/);
assert.match(page, /id="format-btn"/);
assert.match(page, /id="compress-btn"/);
assert.match(page, /id="table-output"/);
assert.match(page, /id="placeholder-output"/);
assert.match(page, /<h2>处理结果<\/h2>[\s\S]*?<button class="btn" id="copy-output-btn">复制结果<\/button>/);
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
