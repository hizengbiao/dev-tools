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

const myBatisSql = `<select id="batchQueryByLocation"
            resultType="com.cmb.see.available.infrastructure.persistent.model.RelationServiceUnitToServiceUnitDO">
        select * from relation_service_unit_to_service_unit where
        (relation_update_time > #{fromTime} or custom_relation_flag = 1)
        <if test="location == 'UPPER'">
            and dst_service_unit_id in
            <foreach collection="serviceUnitIds" item="item" open="(" separator="," close=")">
                #{item}
            </foreach>
        </if>
        <if test="location == 'DOWN'">
            and src_service_unit_id in
            <foreach collection="serviceUnitIds" item="item" open="(" separator="," close=")">
                #{item}
            </foreach>
        </if>
        and src_service_unit_id not in (select service_unit_id from relation_white_list where mode in ('UP', 'ALL'))
        and dst_service_unit_id not in (select service_unit_id from relation_white_list where mode in ('DOWN', 'ALL'))
    </select>`;

assert.strictEqual(sql.isMyBatisSql(myBatisSql), true);
assert.strictEqual(
    sql.formatSql(myBatisSql),
    `<select id="batchQueryByLocation" resultType="com.cmb.see.available.infrastructure.persistent.model.RelationServiceUnitToServiceUnitDO">
  SELECT *
  FROM relation_service_unit_to_service_unit
  WHERE (relation_update_time > #{fromTime}
    OR custom_relation_flag = 1)
  <if test="location == 'UPPER'">
    AND dst_service_unit_id IN
    <foreach collection="serviceUnitIds" item="item" open="(" separator="," close=")">
      #{item}
    </foreach>
  </if>
  <if test="location == 'DOWN'">
    AND src_service_unit_id IN
    <foreach collection="serviceUnitIds" item="item" open="(" separator="," close=")">
      #{item}
    </foreach>
  </if>
  AND src_service_unit_id NOT IN (
    SELECT service_unit_id
    FROM relation_white_list
    WHERE mode IN ('UP', 'ALL'))
  AND dst_service_unit_id NOT IN (
    SELECT service_unit_id
    FROM relation_white_list
    WHERE mode IN ('DOWN', 'ALL'))
</select>`
);
assert.deepStrictEqual(
    sql.extractTableNames(myBatisSql),
    ['relation_service_unit_to_service_unit', 'relation_white_list']
);
assert.deepStrictEqual(sql.extractPlaceholders(myBatisSql), ['#{fromTime}', '#{item}']);

const myBatisUpdate = `<update id="updateAccount">
  update account
  <set>
    <if test="name != null">name = #{name,jdbcType=VARCHAR},</if>
    updated_at <![CDATA[ >= ]]> #{fromTime}
  </set>
  where id = #{id}
</update>`;
const formattedMyBatisUpdate = sql.formatSql(myBatisUpdate);
assert.match(formattedMyBatisUpdate, /^<update id="updateAccount">\n  UPDATE account/m);
assert.match(formattedMyBatisUpdate, /<set>\n    <if test="name != null">\n      name = #\{name,jdbcType=VARCHAR\},\n    <\/if>/);
assert.match(formattedMyBatisUpdate, /updated_at <!\[CDATA\[ >= \]\]> #\{fromTime\}/);
assert.deepStrictEqual(sql.extractTableNames(myBatisUpdate), ['account']);
assert.deepStrictEqual(sql.extractPlaceholders(myBatisUpdate), ['#{name,jdbcType=VARCHAR}', '#{fromTime}', '#{id}']);

const myBatisWrites = `<mapper namespace="demo.Mapper">
  <insert id="insertLog">insert into audit_log(id, action) values (#{id}, #{action})</insert>
  <delete id="deleteSession">delete from user_session where user_id = #{userId}</delete>
</mapper>`;
const formattedMyBatisWrites = sql.formatSql(myBatisWrites);
assert.match(formattedMyBatisWrites, /<insert id="insertLog">\n    INSERT INTO audit_log\(id, action\)\n    VALUES \(#\{id}, #\{action\}\)\n  <\/insert>/);
assert.match(formattedMyBatisWrites, /<\/insert>\n\n  <delete id="deleteSession">/);
assert.match(formattedMyBatisWrites, /<delete id="deleteSession">\n    DELETE FROM user_session\n    WHERE user_id = #\{userId\}\n  <\/delete>/);
assert.deepStrictEqual(sql.extractTableNames(myBatisWrites), ['audit_log', 'user_session']);
assert.deepStrictEqual(sql.extractTableNames('<select id="dynamic">select * from ${tableName}</select>'), ['${tableName}']);

const page = fs.readFileSync(path.join(root, 'sql-formatter.html'), 'utf8');
assert.match(page, /<title>SQL 格式化\/压缩工具<\/title>/);
assert.match(page, /<script src="sql-formatter\.js"><\/script>/);
assert.match(page, /<span>V1\.05<\/span>/);
assert.match(page, /<script src="editor-lines\.js"><\/script>/);
assert.match(page, /id="input-lines"/);
assert.match(page, /id="output-lines"/);
assert.match(page, /EditorLines\.refreshLineNumbers/);
assert.match(page, /EditorLines\.syncLineNumberScroll/);
assert.match(page, /<div class="changelog-date">2026年7月11日<\/div>[\s\S]*?<div class="changelog-version">V1\.00<\/div>/);
assert.match(page, /<div class="changelog-date">2026年7月22日<\/div>[\s\S]*?<div class="changelog-version">V1\.01<\/div>/);
assert.match(page, /<div class="changelog-date">2026年7月23日<\/div>[\s\S]*?<div class="changelog-version">V1\.02<\/div>/);
assert.match(page, /<div class="changelog-date">2026年7月23日<\/div>[\s\S]*?<div class="changelog-version">V1\.03<\/div>/);
assert.match(page, /<div class="changelog-date">2026年7月23日<\/div>[\s\S]*?<div class="changelog-version">V1\.04<\/div>/);
assert.match(page, /<div class="changelog-date">2026年7月23日<\/div>[\s\S]*?<div class="changelog-version">V1\.05<\/div>/);
assert.match(page, /class="modal-overlay"/);
assert.match(page, /onclick="closeChangelog\(\)"/);
assert.doesNotMatch(page, /hideChangelog/);
assert.match(page, /max-width:\s*1800px/);
assert.match(page, /height:\s*clamp\(380px, 55vh, 600px\)/);
assert.match(page, /resize:\s*none/);
assert.match(page, /<div class="input-actions">[\s\S]*?id="format-btn"[\s\S]*?id="compress-btn"[\s\S]*?id="clear-btn"/);
assert.match(page, /id="sql-input"/);
assert.match(page, /id="format-btn"/);
assert.match(page, /id="compress-btn"/);
assert.match(page, /id="table-output"/);
assert.match(page, /id="placeholder-output"/);
assert.match(page, /<h2>处理结果<\/h2>[\s\S]*?<button class="btn" id="copy-output-btn">复制结果<\/button>/);
assert.match(page, /SqlFormatter\.formatSql/);
assert.match(page, /MyBatis/);

const nav = fs.readFileSync(path.join(root, 'nav.js'), 'utf8');
const home = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
const development = fs.readFileSync(path.join(root, 'DEVELOPMENT.md'), 'utf8');
assert.match(nav, /name: 'SQL 格式化', path: 'sql-formatter\.html'/);
assert.match(home, /href="sql-formatter\.html"/);
assert.match(readme, /sql-formatter\.html/);
assert.match(development, /sql-formatter\.html/);

console.log('sql formatter behavior passed');
