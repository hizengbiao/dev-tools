const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const matcher = require(path.resolve(__dirname, '../json-bracket-matcher.js'));

const nested = '{"items":[{"name":"alpha"}]}';
assert.strictEqual(matcher.findMatchingCloseBracket(nested, 0), nested.length - 1);
assert.strictEqual(matcher.findMatchingOpenBracket(nested, nested.length - 1), 0);

const withStringBrackets = '{"text":"ignore ] and }","list":[1,2]}';
const listOpen = withStringBrackets.indexOf('[');
const listClose = withStringBrackets.lastIndexOf(']');
assert.strictEqual(matcher.findMatchingCloseBracket(withStringBrackets, listOpen), listClose);
assert.strictEqual(matcher.findMatchingOpenBracket(withStringBrackets, listClose), listOpen);

const doubleQuoted = '{"text":"a \\"quoted\\" value"}';
const textOpenQuote = doubleQuoted.indexOf('"a');
const textCloseQuote = doubleQuoted.lastIndexOf('"');
assert.strictEqual(matcher.findMatchingQuote(doubleQuoted, textOpenQuote), textCloseQuote);
assert.strictEqual(matcher.findMatchingQuote(doubleQuoted, textCloseQuote), textOpenQuote);
assert.strictEqual(matcher.findMatchingQuote(doubleQuoted, doubleQuoted.indexOf('\\"') + 1), -1);

const cursorText = '{"items":[1]}';
const cursorArrayOpen = cursorText.indexOf('[');
const cursorArrayClose = cursorText.indexOf(']');
assert.strictEqual(matcher.findMatchingIndexAroundCursor(cursorText, cursorText.length), 0);
assert.strictEqual(matcher.findMatchingIndexAroundCursor(cursorText, cursorArrayOpen + 1), cursorArrayClose);
assert.strictEqual(matcher.findMatchingIndexAroundCursor(cursorText, cursorArrayClose), cursorArrayOpen);
assert.strictEqual(matcher.findMatchingIndexAroundCursor('"abc"', 1), 4);
assert.strictEqual(matcher.findMatchingIndexAroundCursor('abc', 1), -1);

assert.strictEqual(matcher.findMatchingOpenBracket('(]', 1), -1);
assert.strictEqual(matcher.findMatchingCloseBracket('(]', 0), -1);
assert.strictEqual(matcher.findMatchingQuote('abc', 1), -1);

const page = fs.readFileSync(path.resolve(__dirname, '../json-parser.html'), 'utf8');
assert.match(page, /<script src="json-bracket-matcher\.js"><\/script>/);
assert.match(page, /JsonBracketMatcher\.findMatchingIndexAroundCursor\(text, pos\)/);
assert.doesNotMatch(page, /function findMatchingOpenBracket\(text, closeBracketPos\)/);
assert.doesNotMatch(page, /function findMatchingCloseBracket\(text, openBracketPos\)/);
assert.doesNotMatch(page, /function findMatchingQuote\(text, quotePos\)/);
assert.doesNotMatch(page, /const openingBrackets = new Set/);
assert.doesNotMatch(page, /const closingBrackets = new Set/);

console.log('json bracket matcher behavior and integration passed');
