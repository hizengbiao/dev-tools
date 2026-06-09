const assert = require('node:assert');
const path = require('node:path');

const converter = require(path.resolve(__dirname, '../text-case-converter.js'));
const fs = require('node:fs');

const sample = 'Character set incompatible';
const html = fs.readFileSync(path.resolve(__dirname, '../text-case-converter.html'), 'utf8');

assert.strictEqual(converter.toSnakeCase(sample), 'character_set_incompatible');
assert.strictEqual(converter.toConstantCase(sample), 'CHARACTER_SET_INCOMPATIBLE');
assert.strictEqual(converter.toKebabCase(sample), 'character-set-incompatible');
assert.strictEqual(converter.toCamelCase(sample), 'characterSetIncompatible');
assert.strictEqual(converter.toPascalCase(sample), 'CharacterSetIncompatible');
assert.strictEqual(converter.toTitleCase('character_set incompatible'), 'Character Set Incompatible');
assert.strictEqual(converter.toSentenceCase('CHARACTER_SET_INCOMPATIBLE'), 'Character set incompatible');
assert.strictEqual(converter.swapText('left', 'right').input, 'right');
assert.strictEqual(converter.swapText('left', 'right').output, 'left');

assert.match(html, /<div class="quick-actions">[\s\S]*常量变量名/);
assert.match(html, /<div class="quick-actions">[\s\S]*下划线命名[\s\S]*小驼峰命名[\s\S]*大驼峰命名[\s\S]*短横线命名/);
assert.match(html, /<div class="quick-actions">[\s\S]*标题格式[\s\S]*句子格式[\s\S]*全部大写[\s\S]*全部小写[\s\S]*清理多余空格/);
assert.doesNotMatch(html, />snake_case</);
assert.doesNotMatch(html, />camelCase</);
assert.doesNotMatch(html, />PascalCase</);
assert.doesNotMatch(html, />kebab-case</);
assert.doesNotMatch(html, />Title Case</);
assert.doesNotMatch(html, />Sentence case</);
assert.doesNotMatch(html, />整理空格</);
assert.doesNotMatch(html, /<div class="actions">[\s\S]*转换大小写[\s\S]*<\/div>/);
assert.doesNotMatch(html, />转换驼峰</);
assert.match(html, /<span>V1\.02<\/span>/);
assert.match(html, /<div class="changelog-version">V1\.02<\/div>/);
assert.match(html, /优化功能区按钮文案，改为更直观的中文描述/);
assert.match(html, /<div class="changelog-version">V1\.01<\/div>/);
assert.match(html, /常量变量名入口移动到快捷功能区，并移除转换驼峰按钮/);

console.log('text case converter behavior passed');
