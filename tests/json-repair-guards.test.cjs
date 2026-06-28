const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const rootDir = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(rootDir, 'json-repair-guards.js'), 'utf8');
const context = {
    window: {},
    module: { exports: {} },
};
context.globalThis = context;
vm.runInNewContext(source, context);

const JsonRepairGuards = context.module.exports;

const regexSnippet = String.raw`"(jdbc:mysql://[^,\\s]+|jdbc:postgresql://[^,\\s]+" 
                    + "|jdbc:gaussdb://[^,\\s]+)"`;

assert.equal(JsonRepairGuards.looksLikeCodeStringConcatenation(regexSnippet), true);
assert.equal(JsonRepairGuards.looksLikeRegexSnippet(regexSnippet), true);
assert.equal(JsonRepairGuards.shouldSkipJsonRepair(regexSnippet), true);
assert.equal(JsonRepairGuards.shouldSkipJsonRepair('{"name":"demo","items":[1,2]}'), false);
assert.equal(JsonRepairGuards.shouldSkipJsonRepair('[{"name":"demo"}]'), false);
assert.equal(JsonRepairGuards.shouldSkipJsonRepair(''), false);

const page = fs.readFileSync(path.join(rootDir, 'json-parser.html'), 'utf8');
assert.match(page, /<script src="json-repair-guards\.js"><\/script>/);
assert.match(page, /JsonRepairGuards\.shouldSkipJsonRepair/);
assert.doesNotMatch(page, /function shouldSkipJsonRepair\(raw\)/);
assert.doesNotMatch(page, /function looksLikeCodeStringConcatenation\(raw\)/);
assert.doesNotMatch(page, /function looksLikeRegexSnippet\(raw\)/);

console.log('json repair guards passed');
