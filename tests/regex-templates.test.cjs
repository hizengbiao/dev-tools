const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const rootDir = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(rootDir, 'regex-templates.js'), 'utf8');
const context = {
    window: {},
    module: { exports: {} },
};
context.globalThis = context;
vm.runInNewContext(source, context);

const RegexTemplates = context.module.exports;

assert.ok(Array.isArray(RegexTemplates.templates));
assert.equal(RegexTemplates.templates.length, 7);
assert.deepEqual(
    JSON.parse(JSON.stringify(RegexTemplates.templates.map((template) => template.id))),
    ['phone', 'url', 'jdbc', 'ipv4', 'email', 'log-time', 'stack']
);

const phone = RegexTemplates.getTemplateById('phone');
assert.equal(phone.name, '手机号脱敏');
assert.equal(phone.pattern, '^(1[3-9]\\d{2})\\d{3}(\\d{4})$');
assert.equal(phone.replacement, '$1***$2');
assert.equal(phone.flags, 'gm');

const jdbc = RegexTemplates.getTemplateById('jdbc');
assert.match(jdbc.pattern, /jdbc:mysql/);
assert.match(jdbc.sample, /connectTimeout=10000/);

assert.equal(RegexTemplates.getTemplateById('missing'), null);

const page = fs.readFileSync(path.join(rootDir, 'regex-tester.html'), 'utf8');
assert.match(page, /<script src="regex-templates\.js"><\/script>/);
assert.match(page, /RegexTemplates\.templates/);
assert.doesNotMatch(page, /const regexTemplates = \[/);

console.log('regex templates module passed');
