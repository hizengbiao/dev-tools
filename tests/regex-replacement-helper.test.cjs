const assert = require('node:assert');
const path = require('node:path');

const RegexReplacementHelper = require(path.resolve(__dirname, '../regex-replacement-helper.js'));

const sourceText = 'user=alice id=42\nuser=bob id=77';
const matches = [
    {
        text: 'user=alice id=42',
        index: 0,
        groups: ['alice', '42'],
        namedGroups: { user: 'alice', id: '42' },
    },
    {
        text: 'user=bob id=77',
        index: 17,
        groups: ['bob', '77'],
        namedGroups: { user: 'bob', id: '77' },
    },
];

assert.deepEqual(RegexReplacementHelper.buildReplacementGroups(matches, sourceText), [
    {
        token: '$1',
        label: '第 1 个捕获分组',
        sample: 'alice',
        source: 'user=alice id=42',
        line: 1,
        column: 1,
    },
    {
        token: '$2',
        label: '第 2 个捕获分组',
        sample: '42',
        source: 'user=alice id=42',
        line: 1,
        column: 1,
    },
    {
        token: '$<user>',
        label: '命名分组 user',
        sample: 'alice',
        source: 'user=alice id=42',
        line: 1,
        column: 1,
    },
    {
        token: '$<id>',
        label: '命名分组 id',
        sample: '42',
        source: 'user=alice id=42',
        line: 1,
        column: 1,
    },
]);

assert.equal(
    RegexReplacementHelper.renderReplacementGroupsText(matches, sourceText),
    [
        '$1\t第 1 个捕获分组\t示例值：alice\t来源：第 1 行第 1 列 user=alice id=42',
        '$2\t第 2 个捕获分组\t示例值：42\t来源：第 1 行第 1 列 user=alice id=42',
        '$<user>\t命名分组 user\t示例值：alice\t来源：第 1 行第 1 列 user=alice id=42',
        '$<id>\t命名分组 id\t示例值：42\t来源：第 1 行第 1 列 user=alice id=42',
    ].join('\n'),
);

assert.equal(
    RegexReplacementHelper.renderReplacementGroupsText([], sourceText),
    '没有可用的捕获分组。先添加括号分组并执行匹配，例如 (\\d+) 会生成 $1。',
);

assert.equal(
    RegexReplacementHelper.renderReplacementGroupsText([{ text: 'abc', index: 0, groups: [] }], sourceText),
    '没有可用的捕获分组。先添加括号分组并执行匹配，例如 (\\d+) 会生成 $1。',
);

console.log('regex replacement helper tests passed');
