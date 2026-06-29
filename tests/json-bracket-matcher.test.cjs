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

assert.deepStrictEqual(
    matcher.calculateHighlightOverlayStyle(
        { left: 20, top: 30, width: 3, height: 18 },
        { offsetLeft: 12, offsetTop: 8, scrollLeft: 5, scrollTop: 7 }
    ),
    {
        left: '27px',
        top: '31px',
        width: '8px',
        height: '18px',
    }
);
assert.deepStrictEqual(
    matcher.calculateHighlightOverlayStyle(
        { left: 2, top: 4, width: 16, height: 20 },
        { offsetLeft: 1, offsetTop: 3, scrollLeft: 0, scrollTop: 2 }
    ),
    {
        left: '3px',
        top: '5px',
        width: '16px',
        height: '20px',
    }
);

assert.deepStrictEqual(
    matcher.buildTextMirrorStyle(
        {
            fontFamily: 'Consolas',
            fontSize: '13px',
            lineHeight: '20px',
            padding: '10px',
        },
        640
    ),
    {
        position: 'absolute',
        visibility: 'hidden',
        whiteSpace: 'pre-wrap',
        wordWrap: 'break-word',
        fontFamily: 'Consolas',
        fontSize: '13px',
        lineHeight: '20px',
        padding: '10px',
        width: '640px',
        boxSizing: 'border-box',
        left: '0',
        top: '0',
    }
);

assert.deepStrictEqual(matcher.splitTextAroundIndex('abcdef', 2), {
    beforeText: 'ab',
    targetChar: 'c',
    afterText: 'def',
});
assert.deepStrictEqual(matcher.splitTextAroundIndex('abcdef', 6), {
    beforeText: 'abcdef',
    targetChar: '',
    afterText: '',
});

assert.deepStrictEqual(
    matcher.calculateRelativeMarkerPosition(
        { left: 130, top: 260, width: 9, height: 18 },
        { left: 100, top: 200 }
    ),
    {
        left: 30,
        top: 60,
        width: 9,
        height: 18,
    }
);

assert.strictEqual(matcher.findMatchingOpenBracket('(]', 1), -1);
assert.strictEqual(matcher.findMatchingCloseBracket('(]', 0), -1);
assert.strictEqual(matcher.findMatchingQuote('abc', 1), -1);

const page = fs.readFileSync(path.resolve(__dirname, '../json-parser.html'), 'utf8');
assert.match(page, /<script src="json-bracket-matcher\.js"><\/script>/);
assert.match(page, /JsonBracketMatcher\.findMatchingIndexAroundCursor\(text, pos\)/);
assert.match(page, /JsonBracketMatcher\.calculateHighlightOverlayStyle\(/);
assert.match(page, /JsonBracketMatcher\.buildTextMirrorStyle\(/);
assert.match(page, /JsonBracketMatcher\.splitTextAroundIndex\(fullText, charIndex\)/);
assert.match(page, /JsonBracketMatcher\.calculateRelativeMarkerPosition\(markerRect, mirrorRect\)/);
assert.doesNotMatch(page, /function findMatchingOpenBracket\(text, closeBracketPos\)/);
assert.doesNotMatch(page, /function findMatchingCloseBracket\(text, openBracketPos\)/);
assert.doesNotMatch(page, /function findMatchingQuote\(text, quotePos\)/);
assert.doesNotMatch(page, /mirror\.style\.fontFamily = computedStyle\.fontFamily/);
assert.doesNotMatch(page, /const beforeText = fullText\.substring\(0, charIndex\)/);
assert.doesNotMatch(page, /left: markerRect\.left - mirrorRect\.left/);
assert.doesNotMatch(page, /const openingBrackets = new Set/);
assert.doesNotMatch(page, /const closingBrackets = new Set/);

console.log('json bracket matcher behavior and integration passed');
