const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const normalizer = require('../json-java-style-normalizer.js');
const page = fs.readFileSync(path.resolve(__dirname, '../json-parser.html'), 'utf8');

assert.match(page, /<script src="json-java-style-normalizer\.js"><\/script>/);
assert.match(page, /JsonJavaStyleNormalizer\.normalizeJavaStyleObject\(raw\)/);
assert.doesNotMatch(page, /function normalizeJavaStyleObject\(raw\)/);
assert.doesNotMatch(page, /function quoteJavaMapValuesOutsideStrings\(raw\)/);

assert.strictEqual(
    normalizer.normalizeJavaStyleObject('FaultPoint{name=alpha, enabled=true, count=3}'),
    "{name:'alpha', enabled:true, count:3}"
);

assert.strictEqual(
    normalizer.normalizeJavaStyleObject("[FaultPoint{name='x', info={host=db01, port=3306}}, FaultPoint{name=y}]"),
    "[{name:'x', info:{host:'db01', port:3306}}, {name:'y'}]"
);

assert.strictEqual(
    normalizer.normalizeJavaStyleObject('{"expr":"a=b","value":1}'),
    '{"expr":"a=b","value":1}'
);

assert.strictEqual(
    normalizer.normalizeJavaStyleObject("{name=service.name', status=ok}"),
    "{name:'service.name', status:'ok'}"
);

assert.strictEqual(normalizer.hasUnquotedEquals('"a=b"'), false);
assert.strictEqual(normalizer.hasUnquotedEquals('a=b'), true);
assert.strictEqual(normalizer.replaceEqualsOutsideStrings('"a=b"=c'), '"a=b":c');
assert.strictEqual(normalizer.looksLikeJavaStyleObject('callback({"value":1})'), false);

const strategyDto = 'StrategyDTO(type=null, firMip=12.255.85.31, deviceVersion=null, region=sz, businessName=办公二区, ruleId=48, status=enable, action=permit, srcSecurityZone=Intranet, srcIpv4Address=19.0.0.0/8,51.0.0.0/8, dstSecurityZone=ZH02, dstDomain=null, dstAddrName=19.0.47.16/32, dstAddrIp=19.0.27.166/32, dstDnatIpAddress=null, dstNatName=null, dstNatIp=null, serviceName=null, protocol=ICMP,tcp, tcpPort=443,80, lineIndex=null)';
const normalizedStrategyDto = normalizer.normalizeJavaStyleObject(strategyDto);
assert.match(normalizedStrategyDto, /^\{type:null, firMip:'12\.255\.85\.31'/);
assert.match(normalizedStrategyDto, /srcIpv4Address:'19\.0\.0\.0\/8,51\.0\.0\.0\/8'/);
assert.match(normalizedStrategyDto, /protocol:'ICMP,tcp'/);
assert.match(normalizedStrategyDto, /tcpPort:'443,80'/);
assert.match(normalizedStrategyDto, /lineIndex:null\}$/);

assert.strictEqual(
    normalizer.normalizeJavaStyleObject('WrapperDTO(name=test, child=ChildDTO(id=1, tags=a,b))'),
    "{name:'test', child:{id:1, tags:'a,b'}}"
);

console.log('json java style normalizer passed');
