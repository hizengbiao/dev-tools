const assert = require('node:assert');
const path = require('node:path');

const converter = require(path.resolve(__dirname, '../text-case-converter.js'));

const sample = 'Character set incompatible';

assert.strictEqual(converter.toSnakeCase(sample), 'character_set_incompatible');
assert.strictEqual(converter.toConstantCase(sample), 'CHARACTER_SET_INCOMPATIBLE');
assert.strictEqual(converter.toKebabCase(sample), 'character-set-incompatible');
assert.strictEqual(converter.toCamelCase(sample), 'characterSetIncompatible');
assert.strictEqual(converter.toPascalCase(sample), 'CharacterSetIncompatible');
assert.strictEqual(converter.toTitleCase('character_set incompatible'), 'Character Set Incompatible');
assert.strictEqual(converter.toSentenceCase('CHARACTER_SET_INCOMPATIBLE'), 'Character set incompatible');
assert.strictEqual(converter.swapText('left', 'right').input, 'right');
assert.strictEqual(converter.swapText('left', 'right').output, 'left');

console.log('text case converter behavior passed');
