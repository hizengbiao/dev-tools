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
assert.deepStrictEqual(samples.listSamples('cron').map((item) => item.id), [
    'cron.linuxEveryThirtyMinutes',
    'cron.quartzDailyNoon',
]);
assert.throws(() => samples.getSample('missing.sample'), /Unknown sample/);

const sqlPage = fs.readFileSync(path.join(root, 'sql-formatter.html'), 'utf8');
const cronPage = fs.readFileSync(path.join(root, 'cron-parser.html'), 'utf8');
assert.match(sqlPage, /<script src="sample-data\.js"><\/script>/);
assert.match(sqlPage, /SampleData\.getSample\('sql\.basicSelect'\)/);
assert.doesNotMatch(sqlPage, /<textarea id="sql-input" spellcheck="false">select id,name/);
assert.match(cronPage, /<script src="sample-data\.js"><\/script>/);
assert.match(cronPage, /SampleData\.getSample\('cron\.linuxEveryThirtyMinutes'\)/);
assert.match(cronPage, /SampleData\.getSample\('cron\.quartzDailyNoon'\)/);

console.log('sample data registry passed');
