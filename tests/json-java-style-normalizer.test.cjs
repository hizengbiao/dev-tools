const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const normalizer = require('../json-java-style-normalizer.js');
const page = fs.readFileSync(path.resolve(__dirname, '../json-parser.html'), 'utf8');

assert.match(page, /<script src="json-java-style-normalizer\.js\?v=2\.00"><\/script>/);
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
    normalizer.normalizeJavaStyleObject('DTO(message="x:Child{a=1}", child=ChildDTO{id=1})'),
    '{message:"x:Child{a=1}", child:{id:1}}'
);
assert.strictEqual(
    normalizer.normalizeJavaStyleObject(String.raw`DTO(message='quoted\' text:pkg.Child{a=1}', children=[pkg.Child{id=1}])`),
    String.raw`{message:'quoted\' text:pkg.Child{a=1}', children:[{id:1}]}`
);
assert.strictEqual(
    normalizer.normalizeJavaStyleObject(String.raw`DTO(message="quoted\" text[Child{x=1}]", ok=true)`),
    String.raw`{message:"quoted\" text[Child{x=1}]", ok:true}`
);

assert.strictEqual(
    normalizer.normalizeJavaStyleObject("{name=service.name', status=ok}"),
    "{name:'service.name', status:'ok'}"
);

assert.strictEqual(normalizer.hasUnquotedEquals('"a=b"'), false);
assert.strictEqual(normalizer.hasUnquotedEquals('a=b'), true);
assert.strictEqual(normalizer.replaceEqualsOutsideStrings('"a=b"=c'), '"a=b":c');
assert.strictEqual(normalizer.looksLikeJavaStyleObject('callback({"value":1})'), false);
assert.strictEqual(normalizer.looksLikeJavaClassObject('SecurityStrategyDTO(protocolList=[ICMP])'), true);
assert.strictEqual(normalizer.looksLikeJavaClassObject('lkn34ndMetricDTO.lkn34ndMetricItem(name=value)'), true);
assert.strictEqual(normalizer.looksLikeJavaClassObject('FaultPoint{name=x, events=[POLLIN]}'), true);
assert.strictEqual(normalizer.looksLikeJavaClassObject('params={"value":1}'), false);

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

const securityStrategyDto = 'SecurityStrategyDTO(protocolList=[ICMP, tcp], originalDstPortList=null, udpPortList=[], businessName=平联一区, description=ZangXiNuo, urlPatternList=null, srcIpv4List=[221.19.128.0/20, 221.10.80.0/20, 221.19.128.0/20], scheduleList=null, srcAddressList=[335532_id8_SrcGrp], mip=122.55.86.13, action=permit, startTime=null, ruleId=117, area=sz, srcZone=Intranet, dstAddressList=[10.1.243.227/32], dstFqdnList=[], dstZone=Extranet, transSrcIpList=[188.0.8.36/32], dstIpv4List=[110.1.23.27/32], transDstIpList=[150.12.106.21/32], dstIpv6List=[], serviceList=[PING, TCP00021], transDstPort=null, tcpPortList=[21], srcIpv6List=[], endTime=null, status=enable)';
const normalizedSecurityStrategyDto = normalizer.normalizeJavaStyleObject(securityStrategyDto);
assert.match(normalizedSecurityStrategyDto, /protocolList:\['ICMP', 'tcp'\]/);
assert.match(normalizedSecurityStrategyDto, /udpPortList:\[\]/);
assert.match(normalizedSecurityStrategyDto, /srcIpv4List:\['221\.19\.128\.0\/20', '221\.10\.80\.0\/20', '221\.19\.128\.0\/20'\]/);
assert.match(normalizedSecurityStrategyDto, /srcAddressList:\['335532_id8_SrcGrp'\]/);
assert.match(normalizedSecurityStrategyDto, /serviceList:\['PING', 'TCP00021'\]/);
assert.match(normalizedSecurityStrategyDto, /tcpPortList:\[21\]/);
assert.match(normalizedSecurityStrategyDto, /originalDstPortList:null/);
assert.match(normalizedSecurityStrategyDto, /businessName:'平联一区'/);

assert.strictEqual(
    normalizer.quoteJavaListValuesOutsideStrings("[alpha, 1, true, null, ['quoted'], {name=x}, [nested, 2]]"),
    "['alpha', 1, true, null, ['quoted'], {name=x}, ['nested', 2]]"
);

const execComputeResDto = 'ExecComputeResDTO(id=0, execStatus=EXEC_SUCCESS, log=null, disconnected=false, kfQuery=false, recordSource=DOCKER_REPORT, dstTypeEnum=PRIVATE_LINE, relationData={"netstatReportFlag":false,"linktraceReportFlag":false,"cmbAgentReportFlag":false,"srcServiceUnitId":"L6.2@L6_xft_task_UAT_UAT","id":0,"dstCode":"221.1.243.227@21","dockerReportFlag":true}, originData=ReportedDataPreProcessDO(id=0, srcType=ServiceUnit, srcCode=L6.2@L6_xft_task_UAT_UAT, dstType=Ip, dstCode=221.1.243.227@21, dstHost=null, data={"dstIp":"221.1.243.227","dstPort":21,"dstHost":"","protocol":"kafka","connectionState":"","esUserName":"consumer:xft_tax_staff","dstOriginPath":"","lastUpdateTime":"2026-04-27T03:11:58 08:00","serviceUnitCode":"L6.2@L6_xft_task_UAT_UAT","clusterName":"cstest-biz-02-sk-oa","nameSpace":"34df-6hb-uat-default","appName":"lw36-xft-tax-task-k38lq","dstInfo":{"code":"221.1.243.227@21","type":"Ip","host":null}}, recordSource=DOCKER_REPORT, subSource=null, execStatus=WAIT_EXEC, log=容器应用外访数据上报, envType=OA, firstRecordTime=null, recentRecordTime=1777230718000, useServiceConn=false, disconnected=false, ignore=false, databaseStatistics=null), errType=null, err=null, reportDataIdentify=L6.2@L6_xft_task_UAT_UAT@221.1.243.227@21, matchTracks=[RelationMatchTrack(type=MATCH_WITH_PRIVATE_LINE, data=221.1.243.227@21)], multiResult=[])';
const normalizedExecComputeResDto = normalizer.normalizeJavaStyleObject(execComputeResDto);
assert.match(normalizedExecComputeResDto, /^\{id:0, execStatus:'EXEC_SUCCESS'/);
assert.match(normalizedExecComputeResDto, /relationData:\{"netstatReportFlag":false/);
assert.match(normalizedExecComputeResDto, /originData:\{id:0, srcType:'ServiceUnit'/);
assert.match(normalizedExecComputeResDto, /data:\{"dstIp":"221\.1\.243\.227"/);
assert.match(normalizedExecComputeResDto, /log:'容器应用外访数据上报'/);
assert.match(normalizedExecComputeResDto, /matchTracks:\[\{type:'MATCH_WITH_PRIVATE_LINE', data:'221\.1\.243\.227@21'\}\]/);
assert.match(normalizedExecComputeResDto, /multiResult:\[\]\}$/);

const qualifiedMetricDto = String.raw`lkn34ndMetricDTO(resource={sun3k4kl=V7.0\@CL\_DEV\_DEV}, metrics=[lkn34ndMetricDTO.lkn34ndMetricItem(name=bee\_\_operations, metricType=Sum, dataPoints=[lkn34ndMetricDTO.lkn34ndDataPointItem(attributes={database\_name=5.4.11.133\_121\_CRB\_r1\_s1}, aggregation={latest=6.0, latest\_time=2026-08-26 10:47:23})])])`;
const normalizedQualifiedMetricDto = normalizer.normalizeJavaStyleObject(qualifiedMetricDto);
assert.match(normalizedQualifiedMetricDto, /^\{resource:\{sun3k4kl:'V7\.0@CL_DEV_DEV'\}/);
assert.match(normalizedQualifiedMetricDto, /metrics:\[\{name:'bee__operations', metricType:'Sum'/);
assert.match(normalizedQualifiedMetricDto, /dataPoints:\[\{attributes:\{database_name:'5\.4\.11\.133_121_CRB_r1_s1'\}/);
assert.match(normalizedQualifiedMetricDto, /aggregation:\{latest:6\.0, latest_time:'2026-08-26 10:47:23'\}\}\]\}\]\}$/);
assert.strictEqual(
    normalizer.normalizeJavaBareEscapesOutsideStrings(String.raw`{bare\_key=value\@host, quoted="keep\_escape"}`),
    String.raw`{bare_key=value@host, quoted="keep\_escape"}`
);

console.log('json java style normalizer passed');
