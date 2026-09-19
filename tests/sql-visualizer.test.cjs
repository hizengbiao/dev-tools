const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const visualizer = require(path.join(root, 'sql-visualizer.js'));

const mainSql = `SELECT
    u.id,
    u.name,
    COUNT(o.id) AS order_count
FROM user u
LEFT JOIN orders o ON u.id = o.user_id
WHERE u.status = 1 AND o.create_time >= '2026-01-01'
GROUP BY u.id, u.name
HAVING COUNT(o.id) > 5
ORDER BY order_count DESC
LIMIT 20;`;

const main = visualizer.parseSql(mainSql);
assert.strictEqual(main.branches.length, 1);
assert.deepStrictEqual(main.branches[0].tables.map((table) => [table.name, table.alias]), [['user', 'u'], ['orders', 'o']]);
assert.strictEqual(main.branches[0].joins[0].type, 'LEFT JOIN');
assert.strictEqual(main.branches[0].joins[0].condition, 'u.id = o.user_id');
assert.deepStrictEqual(main.branches[0].fields.map((field) => field.alias), ['', '', 'order_count']);
assert.deepStrictEqual(main.branches[0].where.map((item) => item.text), ['u.status = 1', "o.create_time >= '2026-01-01'"]);
assert.deepStrictEqual(main.branches[0].groupBy.map((item) => item.text), ['u.id', 'u.name']);
assert.deepStrictEqual(main.branches[0].having.map((item) => item.text), ['COUNT(o.id) > 5']);
assert.deepStrictEqual(main.branches[0].orderBy.map((item) => item.text), ['order_count DESC']);
assert.strictEqual(main.branches[0].limit, '20');
assert.deepStrictEqual(main.branches[0].tables[0].fields.map((field) => field.name).sort(), ['id', 'name', 'status']);
assert.ok(main.branches[0].tables[0].fields.find((field) => field.name === 'id').roles.includes('JOIN'));

const graph = visualizer.buildGraph(main);
assert.ok(graph.nodes.some((node) => node.type === 'table' && node.title.includes('user')));
assert.ok(graph.nodes.some((node) => node.type === 'where'));
assert.ok(graph.nodes.some((node) => node.type === 'group'));
assert.ok(graph.nodes.some((node) => node.type === 'having'));
assert.ok(graph.nodes.some((node) => node.type === 'select'));
assert.ok(graph.nodes.some((node) => node.type === 'order'));
assert.ok(graph.nodes.some((node) => node.type === 'limit'));
assert.ok(graph.nodes.some((node) => node.type === 'result'));
assert.ok(graph.edges.some((edge) => /LEFT JOIN/.test(edge.label) && /u\.id = o\.user_id/.test(edge.label)));

const subquery = visualizer.parseSql(`SELECT * FROM user WHERE id IN (
    SELECT user_id FROM orders WHERE amount > 1000
)`);
assert.strictEqual(subquery.branches[0].subqueries.length, 1);
assert.deepStrictEqual(subquery.branches[0].subqueries[0].model.branches[0].tables.map((table) => table.name), ['orders']);
assert.ok(visualizer.buildGraph(subquery).nodes.some((node) => node.type === 'subquery'));

const derivedTable = visualizer.parseSql('SELECT x.user_id FROM (SELECT user_id FROM `sales`.`orders`) AS x');
assert.strictEqual(derivedTable.branches[0].tables[0].kind, 'subquery');
assert.strictEqual(derivedTable.branches[0].subqueries.length, 1);
assert.deepStrictEqual(derivedTable.branches[0].subqueries[0].model.branches[0].tables.map((table) => table.name), ['sales.orders']);

const union = visualizer.parseSql('SELECT id, name FROM user_a UNION ALL SELECT id, name FROM user_b');
assert.strictEqual(union.branches.length, 2);
assert.deepStrictEqual(union.unions, ['UNION ALL']);
assert.ok(visualizer.buildGraph(union).nodes.some((node) => node.type === 'union' && node.title === 'UNION ALL'));

const cte = visualizer.parseSql(`WITH order_stat AS (
    SELECT user_id, COUNT(*) count FROM orders GROUP BY user_id
)
SELECT * FROM user u LEFT JOIN order_stat o ON u.id = o.user_id`);
assert.strictEqual(cte.ctes.length, 1);
assert.strictEqual(cte.ctes[0].name, 'order_stat');
assert.deepStrictEqual(cte.ctes[0].query.branches[0].tables.map((table) => table.name), ['orders']);
assert.strictEqual(cte.branches[0].tables[1].kind, 'cte');
assert.ok(visualizer.buildGraph(cte).nodes.some((node) => node.type === 'cte'));

assert.throws(
    () => visualizer.parseSql('SELECT * FROM user u LEFT JION orders o ON u.id = o.user_id'),
    (error) => /JOIN 拼写错误/.test(error.message) && /LEFT JOIN/.test(error.suggestion)
);
assert.throws(() => visualizer.parseSql('UPDATE user SET name = ?'), /仅支持 SELECT \/ WITH/);
assert.throws(() => visualizer.parseSql('SELECT * FROM user WHERE id IN (SELECT id FROM orders'), /括号没有闭合/);

const formattedError = visualizer.formatError(new visualizer.SqlVisualizationError('测试错误', 8, '修复建议'), 'SELECT\n*');
assert.deepStrictEqual(formattedError, { message: '测试错误', line: 2, position: 8, suggestion: '修复建议' });

const page = fs.readFileSync(path.join(root, 'sql-formatter.html'), 'utf8');
assert.match(page, /<script src="sql-visualizer\.js"><\/script>/);
assert.match(page, /id="visualize-btn"/);
assert.match(page, /id="sql-visual-modal"/);
assert.match(page, /id="sql-visual-canvas"/);
assert.match(page, /id="visual-zoom-in"/);
assert.match(page, /id="visual-zoom-out"/);
assert.match(page, /id="visual-reset"/);
assert.match(page, /id="visual-fit"/);
assert.match(page, /id="visual-animation"/);
assert.match(page, /SqlVisualizer\.parseSql/);
assert.match(page, /SqlVisualizer\.buildGraph/);
assert.match(page, /setSelectionRange/);

console.log('sql visualizer parser, graph, and integration passed');
