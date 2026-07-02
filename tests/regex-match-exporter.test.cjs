const assert = require('node:assert');
const path = require('node:path');

const RegexMatchExporter = require(path.resolve(__dirname, '../regex-match-exporter.js'));

const text = 'name=alpha,code=100\nname="beta",code=200';
const matches = [
    {
        text: 'name=alpha,code=100',
        index: 0,
        groups: ['alpha', '100'],
        namedGroups: { name: 'alpha', code: '100' },
    },
    {
        text: 'name="beta",code=200',
        index: 20,
        groups: ['"beta"', '200'],
        namedGroups: { name: '"beta"', code: '200' },
    },
];

const json = RegexMatchExporter.exportMatchesAsJson(matches, text);
assert.deepEqual(JSON.parse(json), [
    {
        no: 1,
        text: 'name=alpha,code=100',
        index: 0,
        line: 1,
        column: 1,
        groups: ['$1=alpha', '$2=100'],
        namedGroups: { name: 'alpha', code: '100' },
    },
    {
        no: 2,
        text: 'name="beta",code=200',
        index: 20,
        line: 2,
        column: 1,
        groups: ['$1="beta"', '$2=200'],
        namedGroups: { name: '"beta"', code: '200' },
    },
]);

assert.equal(
    RegexMatchExporter.exportMatchesAsCsv(matches, text),
    [
        'no,text,index,line,column,group1,group2,namedGroups',
        '1,"name=alpha,code=100",0,1,1,alpha,100,"{""name"":""alpha"",""code"":""100""}"',
        '2,"name=""beta"",code=200",20,2,1,"""beta""",200,"{""name"":""\\""beta\\"""",""code"":""200""}"',
    ].join('\n'),
);

assert.equal(
    RegexMatchExporter.exportMatchesAsGroupColumns(matches, text),
    [
        '序号\t匹配内容\t起始位置\t行\t列\t$1\t$2\t命名分组',
        '1\tname=alpha,code=100\t0\t1\t1\talpha\t100\t{"name":"alpha","code":"100"}',
        '2\tname="beta",code=200\t20\t2\t1\t"beta"\t200\t{"name":"\\"beta\\"","code":"200"}',
    ].join('\n'),
);

assert.equal(RegexMatchExporter.exportMatchesAsJson([], text), '没有匹配结果可导出。');
assert.equal(RegexMatchExporter.exportMatchesAsCsv([], text), '没有匹配结果可导出。');
assert.equal(RegexMatchExporter.exportMatchesAsGroupColumns([], text), '没有匹配结果可导出。');

console.log('regex match exporter tests passed');
