const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const converter = require('../json-java-converter.js');
const page = fs.readFileSync(path.resolve(__dirname, '../json-parser.html'), 'utf8');

assert.match(page, /<script src="json-java-converter\.js"><\/script>/);
assert.match(page, /JsonJavaConverter\.jsonToJava\(obj\)/);
assert.match(page, /JsonJavaConverter\.javaToJson\(raw\)/);

const javaCode = converter.jsonToJava({
    id: 1,
    name: 'demo',
    enabled: true,
    scores: [1, 2],
    owner: {
        userName: 'alice'
    }
});

assert.match(javaCode, /import java\.util\.List;/);
assert.match(javaCode, /public class Root/);
assert.match(javaCode, /private Integer id;/);
assert.match(javaCode, /private String name;/);
assert.match(javaCode, /private Boolean enabled;/);
assert.match(javaCode, /private List<Integer> scores;/);
assert.match(javaCode, /private OwnerType owner;/);
assert.match(javaCode, /public class OwnerType/);
assert.match(javaCode, /private String userName;/);

const json = converter.javaToJson(`
public class Root {
    private Integer id;
    private String name;
    private Boolean enabled;
    private List<OwnerType> owners;
}

public class OwnerType {
    private String userName;
    private Double ratio;
}
`);

assert.deepStrictEqual(json, {
    id: 86600,
    name: '新值',
    enabled: false,
    owners: [
        {
            userName: '新值',
            ratio: 0
        }
    ]
});

assert.throws(() => converter.javaToJson('class NotPublic {}'), /未识别到 Java 类定义/);

console.log('json java converter passed');
