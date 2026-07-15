const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const samples = require(path.join(root, 'sample-data.js'));

assert.strictEqual(
    samples.getSample('sql.basicSelect'),
    'select id,name from users where id=? and status=:status order by created_at desc'
);
assert.strictEqual(samples.getSample('cron.linuxEveryThirtyMinutes'), '*/30 * * * *');
assert.strictEqual(samples.getSample('cron.quartzDailyNoon'), '0 0 12 * * ?');
const jsonSample = JSON.parse(samples.getSample('json.nestedExample'));
assert.strictEqual(jsonSample.service.name, 'demo-service');
assert.deepStrictEqual(jsonSample.service.ports, [8080, 8443]);
assert.strictEqual(JSON.parse(jsonSample.metadataJson).owner, 'team-a');
assert.deepStrictEqual(samples.listSamples('cron').map((item) => item.id), [
    'cron.linuxEveryThirtyMinutes',
    'cron.quartzDailyNoon',
]);
assert.throws(() => samples.getSample('missing.sample'), /Unknown sample/);

const sqlPage = fs.readFileSync(path.join(root, 'sql-formatter.html'), 'utf8');
const cronPage = fs.readFileSync(path.join(root, 'cron-parser.html'), 'utf8');
const jsonPage = fs.readFileSync(path.join(root, 'json-parser.html'), 'utf8');
assert.match(sqlPage, /<script src="sample-data\.js"><\/script>/);
assert.match(sqlPage, /SampleData\.getSample\('sql\.basicSelect'\)/);
assert.doesNotMatch(sqlPage, /<textarea id="sql-input" spellcheck="false">select id,name/);
assert.match(cronPage, /<script src="sample-data\.js"><\/script>/);
assert.match(cronPage, /SampleData\.getSample\('cron\.linuxEveryThirtyMinutes'\)/);
assert.match(cronPage, /SampleData\.getSample\('cron\.quartzDailyNoon'\)/);
assert.match(jsonPage, /<script src="sample-data\.js"><\/script>/);
assert.match(jsonPage, /id="load-sample-btn"/);
assert.match(jsonPage, /SampleData\.getSample\('json\.nestedExample'\)/);
assert.match(jsonPage, /function loadJsonSample\(\)/);
assert.match(jsonPage, /function loadJsonSample\(\)[\s\S]*?handleFormat\(\)/);

console.log('sample data registry passed');
