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
assert.strictEqual(
    converter.convertLines('user_name\norder-id\n\nURL value', converter.toCamelCase),
    'userName\norderId\n\nurlValue'
);
assert.strictEqual(
    converter.convertLines('USER_NAME\n\nORDER_ID', converter.toLowerCase).split('\n').length,
    3
);
assert.deepStrictEqual(
    converter.extractFieldNames(`select user_id, user_name as userName, count(*) total_count from users`),
    ['user_id', 'user_name', 'total_count']
);
assert.deepStrictEqual(
    converter.extractFieldNames(`private String userName;\n@Column(name = "order_id")\nprivate Long orderId;`),
    ['userName', 'orderId']
);
assert.deepStrictEqual(
    converter.extractFieldNames(`{"user_id": 1, "userName": "A", "nested": {"order_id": 2}}`),
    ['user_id', 'userName', 'nested', 'order_id']
);
assert.strictEqual(
    converter.convertExtractedFields(`select user_id, user_name as userName from users`, converter.toCamelCase),
    'userId\nuserName'
);
assert.deepStrictEqual(converter.generateCodeNames('user name'), {
    constant: 'USER_NAME',
    enumName: 'USER_NAME',
    getter: 'getUserName',
    setter: 'setUserName'
});
assert.deepStrictEqual(converter.generateCodeNames('is_enabled'), {
    constant: 'IS_ENABLED',
    enumName: 'IS_ENABLED',
    getter: 'isEnabled',
    setter: 'setEnabled'
});
assert.strictEqual(
    converter.generateCodeNamesReport('user name\nis_enabled'),
    [
        'user name',
        '  常量: USER_NAME',
        '  枚举: USER_NAME',
        '  Getter: getUserName',
        '  Setter: setUserName',
        '',
        'is_enabled',
        '  常量: IS_ENABLED',
        '  枚举: IS_ENABLED',
        '  Getter: isEnabled',
        '  Setter: setEnabled'
    ].join('\n')
);
assert.deepStrictEqual(converter.applyAffixRules('isEnabled', {
    removePrefixes: ['is'],
    removeSuffixes: []
}), {
    original: 'isEnabled',
    value: 'Enabled',
    removedPrefix: 'is',
    removedSuffix: ''
});
assert.deepStrictEqual(converter.applyAffixRules('userDTO', {
    removePrefixes: [],
    removeSuffixes: ['DTO', 'VO']
}), {
    original: 'userDTO',
    value: 'user',
    removedPrefix: '',
    removedSuffix: 'DTO'
});
assert.strictEqual(
    converter.convertWithAffixRules('mUserName\norderDTO', converter.toCamelCase, {
        removePrefixes: ['m'],
        removeSuffixes: ['DTO']
    }),
    'userName\norder'
);
assert.strictEqual(converter.swapText('left', 'right').input, 'right');
assert.strictEqual(converter.swapText('left', 'right').output, 'left');

assert.match(html, /<section class="format-section">/);
assert.match(html, /<h2>命名格式转换<\/h2>/);
assert.match(html, /选择目标命名格式或文本处理方式，结果会输出到右侧区域/);
assert.match(html, /支持每行一个变量名批量转换/);
assert.match(html, /max-width: 1280px/);
assert.match(html, /grid-template-columns: minmax\(0, 1fr\) 140px minmax\(0, 1fr\)/);
assert.match(html, /\.panel \{[\s\S]*?min-height: 300px/);
assert.match(html, /textarea \{[\s\S]*?min-height: 250px/);
assert.match(html, /\.affix-rules \{[\s\S]*?grid-template-columns: minmax\(190px, 0\.7fr\) minmax\(0, 1fr\) minmax\(0, 1fr\)/);
assert.match(html, /\.affix-rule-field \{[\s\S]*?flex-direction: row/);
assert.match(html, /class="affix-rule-field"[\s\S]*?id="prefix-rules"/);
assert.match(html, /class="affix-rule-field"[\s\S]*?id="suffix-rules"/);
assert.match(html, /\.format-actions/);
assert.match(html, /\.format-btn/);
assert.match(html, /onclick="convertText\('constant'\)"[^>]*>大写下划线命名<\/button>/);
assert.match(html, /onclick="convertText\('snake'\)"[^>]*>小写下划线命名<\/button>/);
assert.doesNotMatch(html, />常量变量名<\/button>/);
assert.doesNotMatch(html, />下划线命名<\/button>/);
assert.match(html, /<div class="quick-actions format-actions">[\s\S]*小驼峰命名[\s\S]*大驼峰命名[\s\S]*短横线命名/);
assert.match(html, /<div class="quick-actions format-actions">[\s\S]*标题格式[\s\S]*句子格式[\s\S]*全部大写[\s\S]*全部小写[\s\S]*清理多余空格/);
assert.doesNotMatch(html, />snake_case</);
assert.doesNotMatch(html, />camelCase</);
assert.doesNotMatch(html, />PascalCase</);
assert.doesNotMatch(html, />kebab-case</);
assert.doesNotMatch(html, />Title Case</);
assert.doesNotMatch(html, />Sentence case</);
assert.doesNotMatch(html, />整理空格</);
assert.doesNotMatch(html, /<div class="actions">[\s\S]*转换大小写[\s\S]*<\/div>/);
assert.doesNotMatch(html, />转换驼峰</);
assert.match(html, /<span>V1\.10<\/span>/);
assert.match(html, /<div class="changelog-date">2026年7月23日<\/div>[\s\S]*?<div class="changelog-version">V1\.10<\/div>/);
assert.match(html, /<div class="changelog-date">2026年7月23日<\/div>[\s\S]*?<div class="changelog-version">V1\.09<\/div>/);
assert.match(html, /<div class="changelog-date">2026年7月13日<\/div>[\s\S]*?<div class="changelog-version">V1\.08<\/div>/);
assert.match(html, /<div class="changelog-date">2026年7月10日<\/div>[\s\S]*?<div class="changelog-version">V1\.07<\/div>[\s\S]*?<div class="changelog-version">V1\.06<\/div>/);
assert.match(html, /前后缀规则/);
assert.match(html, /id="prefix-rules"/);
assert.match(html, /id="suffix-rules"/);
assert.match(html, /getAffixRuleOptions\(\)/);
assert.match(html, /convertWithAffixRules\(value, handlers\[type\], getAffixRuleOptions\(\)\)/);
assert.match(html, /<div class="changelog-version">V1\.07<\/div>/);
assert.match(html, /<div class="changelog-date">2026年7月10日<\/div>[\s\S]*?<div class="changelog-version">V1\.06<\/div>[\s\S]*?<div class="changelog-version">V1\.05<\/div>/);
assert.match(html, /生成代码命名/);
assert.match(html, /generateCodeNamesReport\(value\)/);
assert.match(html, /<div class="changelog-version">V1\.06<\/div>/);
assert.match(html, /<div class="changelog-date">2026年7月10日<\/div>[\s\S]*?<div class="changelog-version">V1\.05<\/div>[\s\S]*?<div class="changelog-version">V1\.04<\/div>/);
assert.match(html, /提取字段并转小驼峰/);
assert.match(html, /提取字段并转下划线/);
assert.match(html, /convertExtractedFields\(value, handlers\[targetType\]\)/);
assert.match(html, /<div class="changelog-version">V1\.05<\/div>/);
assert.match(html, /<div class="changelog-date">2026年7月10日<\/div>[\s\S]*?<div class="changelog-version">V1\.04<\/div>/);
assert.match(html, /批量变量名转换/);
assert.match(html, /converter\.convertLines/);
assert.match(html, /convertLines\(value, handlers\[type\]\)/);
assert.match(html, /<div class="changelog-version">V1\.04<\/div>/);
assert.match(html, /<div class="changelog-version">V1\.03<\/div>/);
assert.match(html, /增加命名格式转换功能区说明，并优化下方功能按钮样式/);
assert.match(html, /<div class="changelog-version">V1\.02<\/div>/);
assert.match(html, /优化功能区按钮文案，改为更直观的中文描述/);
assert.match(html, /<div class="changelog-version">V1\.01<\/div>/);
assert.match(html, /常量变量名入口移动到快捷功能区，并移除转换驼峰按钮/);

console.log('text case converter behavior passed');
