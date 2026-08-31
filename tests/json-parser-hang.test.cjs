const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const pagePath = path.resolve(__dirname, '../json-parser.html');
const page = fs.readFileSync(pagePath, 'utf8');
const script = [...page.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g)]
    .map((match) => match[1])
    .join('\n');

assert.match(page, /<span>V1\.98<\/span>/);
assert.match(page, /<div class="changelog-date">2026年8月31日<\/div>[\s\S]*?<div class="changelog-version">V1\.98<\/div>[\s\S]*?<div class="changelog-version">V1\.97<\/div>/);
assert.match(page, /<div class="changelog-date">2026年8月31日<\/div>[\s\S]*?<div class="changelog-version">V1\.97<\/div>/);
assert.match(page, /<div class="changelog-date">2026年8月18日<\/div>[\s\S]*?<div class="changelog-version">V1\.96<\/div>[\s\S]*?<div class="changelog-version">V1\.95<\/div>/);
assert.match(page, /<div class="changelog-date">2026年8月13日<\/div>[\s\S]*?<div class="changelog-version">V1\.94<\/div>/);
assert.match(page, /<div class="changelog-date">2026年7月23日<\/div>[\s\S]*?<div class="changelog-version">V1\.93<\/div>/);
assert.match(page, /<div class="changelog-date">2026年7月15日<\/div>[\s\S]*?<div class="changelog-version">V1\.92<\/div>/);
assert.match(page, /<div class="changelog-date">2026年7月13日<\/div>[\s\S]*?<div class="changelog-version">V1\.91<\/div>/);
assert.match(page, /<div class="changelog-date">2026年7月4日<\/div>[\s\S]*?<div class="changelog-version">V1\.90<\/div>/);
assert.match(page, /<div class="changelog-version">V1\.90<\/div>/);
assert.match(page, /<div class="changelog-version">V1\.89<\/div>/);
assert.match(page, /<div class="changelog-version">V1\.88<\/div>/);
assert.match(page, /<div class="changelog-version">V1\.87<\/div>/);
assert.match(page, /<div class="changelog-version">V1\.86<\/div>/);
assert.match(page, /<div class="changelog-version">V1\.85<\/div>/);
assert.match(page, /<div class="changelog-version">V1\.84<\/div>/);
assert.match(page, /<div class="changelog-version">V1\.83<\/div>/);
assert.match(page, /<div class="changelog-version">V1\.82<\/div>/);
assert.match(page, /2026[\s\S]*?7[\s\S]*?1[\s\S]*?<div class="changelog-version">V1\.88<\/div>/);
assert.match(page, /<div class="changelog-version">V1\.81<\/div>/);
assert.match(page, /<div class="changelog-date">2026年6月25日<\/div>[\s\S]*?<div class="changelog-version">V1\.81<\/div>/);
assert.match(page, /<div class="changelog-date">2026年6月11日<\/div>/);
assert.match(page, /<div class="changelog-version">V1\.80<\/div>/);
assert.match(page, /<script src="json-repair-guards\.js"><\/script>/);
assert.match(page, /<script src="json-assignment-extractor\.js"><\/script>/);
assert.match(page, /<script src="json-repair-normalizer\.js"><\/script>/);
assert.match(page, /<script src="json-java-style-normalizer\.js"><\/script>/);
assert.match(page, /!JsonJavaStyleNormalizer\.looksLikeJavaStyleObject\(raw\)/);
assert.match(page, /<script src="json-path-query\.js"><\/script>/);
assert.doesNotMatch(page, /<script src="json-key-paths\.js"><\/script>/);
assert.doesNotMatch(page, /<script src="json-search-results\.js"><\/script>/);
assert.match(page, /<script src="json-string-fields\.js"><\/script>/);
assert.doesNotMatch(page, /<button[^>]+onclick="expandJsonStringFields\(\)"/);
assert.doesNotMatch(page, /<button[^>]+onclick="restoreJsonStringFields\(\)"/);
assert.match(page, /function expandJsonStringFieldAtPath\(path\)/);
assert.match(page, /function restoreJsonStringFieldAtPath\(path\)/);
assert.match(page, /JsonStringFields\.expandStringifiedJsonFieldAtPath\(currentObj, path\)/);
assert.match(page, /JsonStringFields\.restoreStringifiedJsonFieldAtPath\(currentObj, path\)/);
assert.doesNotMatch(page, /id="json-path-input"/);
assert.doesNotMatch(page, /id="json-path-result"/);
assert.doesNotMatch(page, /function handleJsonPathQuery\(\)/);
assert.doesNotMatch(page, /JsonPathQuery\.queryJsonPath\(target, pathInput\.value\)/);
assert.doesNotMatch(page, /id="json-search-input"/);
assert.doesNotMatch(page, /id="json-search-results"/);
assert.doesNotMatch(page, /function handleJsonSearch\(\)/);
assert.doesNotMatch(page, /JsonSearchResults\.searchJsonTree\(target, jsonSearchInput\.value/);
assert.doesNotMatch(page, /id="json-key-paths-result"/);
assert.doesNotMatch(page, /function handleExtractJsonKeyPaths\(\)/);
assert.doesNotMatch(page, /JsonKeyPaths\.extractJsonKeyPaths\(target\)/);
assert.doesNotMatch(page, /function copyJsonKeyPaths\(\)/);
assert.match(page, /JsonRepairGuards\.shouldSkipJsonRepair\(raw\)/);
assert.match(page, /JsonRepairNormalizer\.normalizeEscapedJsonContainer\(raw\)/);
assert.match(page, /JsonAssignmentExtractor\.extractJsonValueFromAssignmentLog\(raw\)/);
assert.match(page, /!JsonJavaStyleNormalizer\.looksLikeJavaClassObject\(raw\)/);
assert.match(page, /!JsonJavaStyleNormalizer\.looksLikeJavaClassObject\(raw\)[\s\S]*?JsonRepairNormalizer\.stripLeadingLabelBeforeJson\(raw\)/);
assert.match(page, /JsonRepairNormalizer\.stripCommentsOutsideStrings\(raw\)/);
assert.match(page, /JsonRepairNormalizer\.fixChineseColons\(raw\)/);
assert.match(page, /JsonRepairNormalizer\.addMissingCommas\(raw\)/);
assert.match(page, /JsonRepairNormalizer\.addQuotesToUnquotedStrings\(raw\)/);
assert.match(page, /JsonJavaStyleNormalizer\.normalizeJavaStyleObject\(raw\)/);
assert.doesNotMatch(page, /function shouldSkipJsonRepair\(raw\)/);
assert.doesNotMatch(page, /function extractJsonValueFromAssignmentLog\(raw\)/);
assert.doesNotMatch(page, /function stripCommentsOutsideStrings\(raw\)/);
assert.doesNotMatch(page, /function fixChineseColons\(raw\)/);
assert.doesNotMatch(page, /function addMissingCommas\(raw\)/);
assert.doesNotMatch(page, /function addQuotesToUnquotedStrings\(raw\)/);
assert.doesNotMatch(page, /function normalizeJavaStyleObject\(raw\)/);

function createElementStub(id = '') {
    const element = {
        id,
        value: '',
        textContent: '',
        innerHTML: '',
        style: {},
        dataset: {},
        disabled: false,
        className: '',
        children: [],
        scrollIntoViewCallCount: 0,
        classList: {
            add(className) {
                if (!this.owner.className.split(/\s+/).includes(className)) {
                    this.owner.className = `${this.owner.className} ${className}`.trim();
                }
            },
            remove(className) {
                this.owner.className = this.owner.className
                    .split(/\s+/)
                    .filter((item) => item && item !== className)
                    .join(' ');
            },
            contains(className) {
                return this.owner.className.split(/\s+/).includes(className);
            },
        },
        addEventListener() {},
        removeEventListener() {},
        appendChild(child) {
            child.parentElement = this;
            this.children.push(child);
            return child;
        },
        remove() {},
        replaceWith(replacement) {
            if (this.parentElement) {
                const index = this.parentElement.children.indexOf(this);
                if (index >= 0) {
                    replacement.parentElement = this.parentElement;
                    this.parentElement.children[index] = replacement;
                }
            }
            this.replacedWith = replacement;
        },
        contains(target) {
            return this === target || collectElements(this, (candidate) => candidate === target).length > 0;
        },
        querySelectorAll(selector) {
            if (selector === '.json-node') {
                return collectElements(this, (element) => element.className.split(/\s+/).includes('json-node'));
            }
            return [];
        },
        querySelector(selector) {
            if (selector === '.json-row') {
                return collectElements(this, (element) => element.className.split(/\s+/).includes('json-row'))[0] || null;
            }
            return null;
        },
        setAttribute() {},
        focus() {
            this.focusCallCount = (this.focusCallCount || 0) + 1;
        },
        select() {},
        setSelectionRange() {},
        scrollIntoView() {
            this.scrollIntoViewCallCount += 1;
        },
    };
    element.classList.owner = element;
    return element;
}

function collectElements(root, predicate, results = []) {
    if (predicate(root)) {
        results.push(root);
    }

    for (const child of root.children || []) {
        collectElements(child, predicate, results);
    }

    return results;
}

function createHarness() {
    const elements = new Map();
    let copiedText = '';
    const documentListeners = new Map();
    const document = {
        getElementById(id) {
            if (!elements.has(id)) {
                elements.set(id, createElementStub(id));
            }
            return elements.get(id);
        },
        createElement(tagName) {
            const element = createElementStub();
            element.tagName = tagName.toUpperCase();
            return element;
        },
        createTextNode(text) {
            return { textContent: text };
        },
        querySelectorAll(selector) {
            if (selector === '.json-node') {
                return Array.from(elements.values()).flatMap((element) => element.querySelectorAll(selector));
            }
            return [];
        },
        addEventListener(type, listener, options = false) {
            const capture = options === true || Boolean(options && options.capture);
            const listeners = documentListeners.get(type) || [];
            listeners.push({ listener, capture });
            documentListeners.set(type, listeners);
        },
        removeEventListener(type, listener, options = false) {
            const capture = options === true || Boolean(options && options.capture);
            const listeners = documentListeners.get(type) || [];
            documentListeners.set(type, listeners.filter((item) => item.listener !== listener || item.capture !== capture));
        },
        querySelector(selector) {
            if (selector === '.json-node.collapsed') {
                return Array.from(elements.values())
                    .flatMap((element) => element.querySelectorAll('.json-node'))
                    .find((element) => element.classList.contains('collapsed')) || null;
            }
            return null;
        },
        body: createElementStub('body'),
    };
    document.body.classList.owner = document.body;

    const context = {
        document,
        window: {},
        navigator: { clipboard: { readText: async () => '', writeText: async () => {} } },
        ClipboardUtils: {
            showToast() {},
            copyText: async (text) => {
                copiedText = text;
                return true;
            },
        },
        JsonRepairGuards: require(path.resolve(__dirname, '../json-repair-guards.js')),
        JsonAssignmentExtractor: require(path.resolve(__dirname, '../json-assignment-extractor.js')),
        JsonRepairNormalizer: require(path.resolve(__dirname, '../json-repair-normalizer.js')),
        JsonJavaStyleNormalizer: require(path.resolve(__dirname, '../json-java-style-normalizer.js')),
        JsonPathEditor: require(path.resolve(__dirname, '../json-path-editor.js')),
        JsonPathQuery: require(path.resolve(__dirname, '../json-path-query.js')),
        JsonStringFields: require(path.resolve(__dirname, '../json-string-fields.js')),
        console,
        setTimeout: (fn) => {
            fn();
            return 0;
        },
        clearTimeout,
        prompt: () => null,
    };
    context.window = context;

    vm.runInNewContext(script, context, { timeout: 1000 });
    function click(target, targetHandler) {
        let propagationStopped = false;
        let immediatePropagationStopped = false;
        let targetHandlerCalled = false;
        const event = {
            target,
            preventDefault() {},
            stopPropagation() {
                propagationStopped = true;
            },
            stopImmediatePropagation() {
                propagationStopped = true;
                immediatePropagationStopped = true;
            },
        };
        const listeners = [...(documentListeners.get('click') || [])];
        for (const item of listeners.filter((candidate) => candidate.capture)) {
            item.listener(event);
            if (immediatePropagationStopped) break;
        }
        if (!propagationStopped) {
            targetHandlerCalled = true;
            targetHandler(event);
            for (const item of listeners.filter((candidate) => !candidate.capture)) {
                item.listener(event);
                if (immediatePropagationStopped) break;
            }
        }
        return { targetHandlerCalled };
    }

    return { context, elements, getCopiedText: () => copiedText, click };
}

const nonJsonRegexSnippet = String.raw`"(jdbc:mysql://[^,\\s]+|jdbc:postgresql://[^,\\s]+|jdbc:tdsql-mysql://[^,\\s]+|jdbc:postgresql://[^,\\s]+" 
                    + "|jdbc:gaussdb://[^,\\s]+|jdbc:opengauss://[^,\\s]+|jdbc:olap://[^,\\s]+|jdbc:oracle:(thin|oci):@[^,\\s]*"
                    + "|jdbc:sqlserver://[^,\\s]+)"`;

const { context, elements } = createHarness();
elements.get('json-input').value = nonJsonRegexSnippet;

const started = Date.now();
context.handleFormat();
const elapsedMs = Date.now() - started;

assert.ok(elapsedMs < 200, `non-JSON regex snippet should fail fast, took ${elapsedMs}ms`);
assert.equal(elements.get('json-output').innerHTML, '');
assert.equal(elements.get('error-msg').style.display, 'block');
assert.match(elements.get('error-msg').textContent, /JSON|修复|格式/);

const escapedRoutesInput = String.raw`[{\\"hosts\\":[\\"imgcache-uat.alb-uat.cmbchina.cn\\"],\\"methods\\":[],\\"paths\\":[\\"/api\\"],\\"regex\_priority\\":0,\\"preserve\_host\\":false,\\"protocols\\":[\\"http\\",\\"https\\"],\\"strip\_path\\":false}]`;
const escapedRoutesHarness = createHarness();
escapedRoutesHarness.elements.get('json-input').value = escapedRoutesInput;
const escapedRoutesStarted = Date.now();
escapedRoutesHarness.context.handleFormat();
const escapedRoutesElapsedMs = Date.now() - escapedRoutesStarted;

assert.ok(escapedRoutesElapsedMs < 200, `escaped JSON should format without hanging, took ${escapedRoutesElapsedMs}ms`);
assert.equal(escapedRoutesHarness.elements.get('error-msg').style.display, 'none');
assert.deepStrictEqual(JSON.parse(escapedRoutesHarness.elements.get('json-input').value), [{
    hosts: ['imgcache-uat.alb-uat.cmbchina.cn'],
    methods: [],
    paths: ['/api'],
    regex_priority: 0,
    preserve_host: false,
    protocols: ['http', 'https'],
    strip_path: false,
}]);

const truncatedNestedArray = `[
    [
        {
            "id": 0,
            "srcType": "ServiceUnit",
            "data": "{\\"attributes\\":{\\"database_name\\":\\"db-0.cn_30100,db-1.cn_30100,db-2.cn_30100/db\\"},\\"aggregation\\":{\\"latest\\":\\"2.0\\",\\"latest_time\\":\\"2026-06-23 23:59:37\\"}}",
            "disconnected": false`;

const secondHarness = createHarness();
secondHarness.elements.get('json-input').value = truncatedNestedArray;
secondHarness.context.fixJson();

assert.equal(secondHarness.elements.get('error-msg').style.display, 'none');
const repaired = JSON.parse(secondHarness.elements.get('json-input').value);
assert.equal(repaired[0][0].id, 0);
assert.equal(repaired[0][0].srcType, 'ServiceUnit');
assert.equal(repaired[0][0].disconnected, false);
assert.equal(
    JSON.parse(repaired[0][0].data).attributes.database_name,
    'db-0.cn_30100,db-1.cn_30100,db-2.cn_30100/db'
);

const securityStrategyDto = 'SecurityStrategyDTO(protocolList=[ICMP, tcp], originalDstPortList=null, udpPortList=[], businessName=平联一区, description=ZangXiNuo, urlPatternList=null, srcIpv4List=[221.19.128.0/20, 221.10.80.0/20, 221.19.128.0/20], scheduleList=null, srcAddressList=[335532_id8_SrcGrp], mip=122.55.86.13, action=permit, startTime=null, ruleId=117, area=sz, srcZone=Intranet, dstAddressList=[10.1.243.227/32], dstFqdnList=[], dstZone=Extranet, transSrcIpList=[188.0.8.36/32], dstIpv4List=[110.1.23.27/32], transDstIpList=[150.12.106.21/32], dstIpv6List=[], serviceList=[PING, TCP00021], transDstPort=null, tcpPortList=[21], srcIpv6List=[], endTime=null, status=enable)';
const securityStrategyHarness = createHarness();
securityStrategyHarness.elements.get('json-input').value = securityStrategyDto;
securityStrategyHarness.context.fixJson();
const repairedSecurityStrategy = JSON.parse(securityStrategyHarness.elements.get('json-input').value);
assert.deepStrictEqual(repairedSecurityStrategy.protocolList, ['ICMP', 'tcp']);
assert.deepStrictEqual(repairedSecurityStrategy.udpPortList, []);
assert.deepStrictEqual(repairedSecurityStrategy.srcIpv4List, [
    '221.19.128.0/20',
    '221.10.80.0/20',
    '221.19.128.0/20',
]);
assert.deepStrictEqual(repairedSecurityStrategy.serviceList, ['PING', 'TCP00021']);
assert.deepStrictEqual(repairedSecurityStrategy.tcpPortList, [21]);
assert.strictEqual(repairedSecurityStrategy.originalDstPortList, null);
assert.strictEqual(repairedSecurityStrategy.businessName, '平联一区');
assert.strictEqual(repairedSecurityStrategy.ruleId, 117);

const execComputeResDto = 'ExecComputeResDTO(id=0, execStatus=EXEC_SUCCESS, log=null, disconnected=false, kfQuery=false, recordSource=DOCKER_REPORT, dstTypeEnum=PRIVATE_LINE, relationData={"netstatReportFlag":false,"linktraceReportFlag":false,"cmbAgentReportFlag":false,"srcServiceUnitId":"L6.2@L6_xft_task_UAT_UAT","id":0,"dstCode":"221.1.243.227@21","dockerReportFlag":true}, originData=ReportedDataPreProcessDO(id=0, srcType=ServiceUnit, srcCode=L6.2@L6_xft_task_UAT_UAT, dstType=Ip, dstCode=221.1.243.227@21, dstHost=null, data={"dstIp":"221.1.243.227","dstPort":21,"dstHost":"","protocol":"kafka","connectionState":"","esUserName":"consumer:xft_tax_staff","dstOriginPath":"","lastUpdateTime":"2026-04-27T03:11:58 08:00","serviceUnitCode":"L6.2@L6_xft_task_UAT_UAT","clusterName":"cstest-biz-02-sk-oa","nameSpace":"34df-6hb-uat-default","appName":"lw36-xft-tax-task-k38lq","dstInfo":{"code":"221.1.243.227@21","type":"Ip","host":null}}, recordSource=DOCKER_REPORT, subSource=null, execStatus=WAIT_EXEC, log=容器应用外访数据上报, envType=OA, firstRecordTime=null, recentRecordTime=1777230718000, useServiceConn=false, disconnected=false, ignore=false, databaseStatistics=null), errType=null, err=null, reportDataIdentify=L6.2@L6_xft_task_UAT_UAT@221.1.243.227@21, matchTracks=[RelationMatchTrack(type=MATCH_WITH_PRIVATE_LINE, data=221.1.243.227@21)], multiResult=[])';
const execComputeHarness = createHarness();
execComputeHarness.elements.get('json-input').value = execComputeResDto;
execComputeHarness.context.fixJson();
const repairedExecCompute = JSON.parse(execComputeHarness.elements.get('json-input').value);
assert.strictEqual(repairedExecCompute.execStatus, 'EXEC_SUCCESS');
assert.strictEqual(repairedExecCompute.relationData.dockerReportFlag, true);
assert.strictEqual(repairedExecCompute.originData.data.dstInfo.type, 'Ip');
assert.strictEqual(repairedExecCompute.originData.log, '容器应用外访数据上报');
assert.strictEqual(repairedExecCompute.originData.recentRecordTime, 1777230718000);
assert.deepStrictEqual(repairedExecCompute.matchTracks, [{
    type: 'MATCH_WITH_PRIVATE_LINE',
    data: '221.1.243.227@21',
}]);
assert.deepStrictEqual(repairedExecCompute.multiResult, []);

const qualifiedMetricDto = String.raw`lkn34ndMetricDTO(resource={sun3k4kl=V7.0\@CL\_DEV\_DEV}, metrics=[lkn34ndMetricDTO.lkn34ndMetricItem(name=bee\_\_operations, metricType=Sum, dataPoints=[lkn34ndMetricDTO.lkn34ndDataPointItem(attributes={database\_name=5.4.11.133\_121\_CRB\_r1\_s1}, aggregation={latest=6.0, latest\_time=2026-08-26 10:47:23})])])`;
const qualifiedMetricHarness = createHarness();
qualifiedMetricHarness.elements.get('json-input').value = qualifiedMetricDto;
qualifiedMetricHarness.context.handleFormat();
assert.equal(qualifiedMetricHarness.elements.get('error-msg').style.display, 'none');
assert.deepStrictEqual(JSON.parse(qualifiedMetricHarness.elements.get('json-input').value), {
    resource: { sun3k4kl: 'V7.0@CL_DEV_DEV' },
    metrics: [{
        name: 'bee__operations',
        metricType: 'Sum',
        dataPoints: [{
            attributes: { database_name: '5.4.11.133_121_CRB_r1_s1' },
            aggregation: { latest: 6, latest_time: '2026-08-26 10:47:23' },
        }],
    }],
});

const bracketPrefixedParamsLog = '[b3d7e0c5433eda2b3460][FeignRequest][DaFeignService][docail]params={"cluster":"tc-jht03","productId":"L03","appName":"cta","artifactId":"cmata","serviceUuid":"L.03@cata_UAT_UAT"}';

const bracketPrefixHarness = createHarness();
bracketPrefixHarness.elements.get('json-input').value = bracketPrefixedParamsLog;
bracketPrefixHarness.context.fixJson();

assert.equal(bracketPrefixHarness.elements.get('error-msg').style.display, 'none');
assert.deepStrictEqual(JSON.parse(bracketPrefixHarness.elements.get('json-input').value), {
    cluster: 'tc-jht03',
    productId: 'L03',
    appName: 'cta',
    artifactId: 'cmata',
    serviceUuid: 'L.03@cata_UAT_UAT',
});

const descriptivePrefixHarness = createHarness();
descriptivePrefixHarness.elements.get('json-input').value = '消费到云见各决策子系统异常信号：{"objectType":"K8sWorker","objectId":"node-01","impactRangeObjectIdList":[]}';
descriptivePrefixHarness.context.fixJson();

assert.equal(descriptivePrefixHarness.elements.get('error-msg').style.display, 'none');
assert.deepStrictEqual(JSON.parse(descriptivePrefixHarness.elements.get('json-input').value), {
    objectType: 'K8sWorker',
    objectId: 'node-01',
    impactRangeObjectIdList: [],
});

const stringFieldHarness = createHarness();
stringFieldHarness.elements.get('json-input').value = '{"payload":"{\\"name\\":\\"alpha\\"}","plain":"x"}';
stringFieldHarness.context.handleFormat();
const inlineExpandButtons = collectElements(
    stringFieldHarness.elements.get('json-output'),
    (element) => element.title === '展开这个 JSON 字符串字段'
);
assert.equal(inlineExpandButtons.length, 1);
inlineExpandButtons[0].onclick({ stopPropagation() {} });
assert.deepStrictEqual(JSON.parse(stringFieldHarness.elements.get('json-input').value), {
    payload: { name: 'alpha' },
    plain: 'x',
});
const inlineRestoreButtons = collectElements(
    stringFieldHarness.elements.get('json-output'),
    (element) => element.title === '恢复这个 JSON 字符串字段'
);
assert.equal(inlineRestoreButtons.length, 1);
inlineRestoreButtons[0].onclick({ stopPropagation() {} });
assert.deepStrictEqual(JSON.parse(stringFieldHarness.elements.get('json-input').value), {
    payload: '{"name":"alpha"}',
    plain: 'x',
});

const tooltipPathHarness = createHarness();
tooltipPathHarness.elements.get('json-input').value = '{"items":[{"key":"host","a.b":1}]}';
tooltipPathHarness.context.handleFormat();
const keySpans = collectElements(
    tooltipPathHarness.elements.get('json-output'),
    (element) => element.className === 'key'
);
const targetKey = keySpans.find((element) => element.textContent === '"key"');
assert.ok(targetKey, 'tree should render the object key');
targetKey.onmouseenter({ clientX: 0, clientY: 0 });
const pathSegments = collectElements(
    tooltipPathHarness.elements.get('path-tooltip'),
    (element) => element.className === 'path-segment'
);
assert.deepEqual(
    pathSegments.map((element) => element.textContent),
    ['$', 'items', '[0]', 'key']
);
const rootNode = collectElements(
    tooltipPathHarness.elements.get('json-output'),
    (element) => element.className.split(/\s+/).includes('json-node') && element.dataset.path === '[]'
)[0];
assert.ok(rootNode, 'tree should render a root node with empty path');
pathSegments[0].onclick({ stopPropagation() {} });
assert.equal(rootNode.scrollIntoViewCallCount, 1, 'clicking $ should locate the JSON root node');
const copyPathButton = collectElements(
    tooltipPathHarness.elements.get('path-tooltip'),
    (element) => element.className === 'path-copy-btn'
)[0];
assert.ok(copyPathButton, 'tooltip should render a full path copy button');
copyPathButton.onclick({ stopPropagation() {} });
assert.equal(tooltipPathHarness.getCopiedText(), '$.items[0].key');

function createSubtreeEditHarness() {
    const harness = createHarness();
    harness.elements.get('json-input').value = '{"profile":{"name":"before","enabled":true},"keep":1}';
    harness.context.handleFormat();

    const profileNode = collectElements(
        harness.elements.get('json-output'),
        (element) => element.dataset.path === '["profile"]'
    )[0];
    assert.ok(profileNode, 'tree should render the editable profile subtree');

    harness.context.handleEditSubtree(profileNode, ['profile'], { name: 'before', enabled: true });
    const editor = profileNode.replacedWith;
    const textarea = collectElements(editor, (element) => element.className === 'subtree-textarea')[0];
    assert.ok(textarea, 'subtree edit should open a textarea');
    textarea.value = '{"name":"after","enabled":false}';
    return { ...harness, textarea };
}

const editThenSourceHarness = createSubtreeEditHarness();
editThenSourceHarness.click(createElementStub('edit-button'), () => editThenSourceHarness.context.showEditor());
assert.deepStrictEqual(JSON.parse(editThenSourceHarness.elements.get('json-input').value), {
    profile: { name: 'after', enabled: false },
    keep: 1,
});

const editThenMinifyHarness = createSubtreeEditHarness();
editThenMinifyHarness.click(createElementStub('minify-button'), () => editThenMinifyHarness.context.handleMinify());
assert.equal(
    editThenMinifyHarness.elements.get('json-input').value,
    '{"profile":{"name":"after","enabled":false},"keep":1}'
);

const editThenFormatHarness = createSubtreeEditHarness();
editThenFormatHarness.click(createElementStub('format-button'), () => editThenFormatHarness.context.handleFormat());
assert.deepStrictEqual(JSON.parse(editThenFormatHarness.elements.get('json-input').value), {
    profile: { name: 'after', enabled: false },
    keep: 1,
});

const invalidSubtreeHarness = createSubtreeEditHarness();
invalidSubtreeHarness.textarea.value = '{"name":';
let invalidFormatCalled = false;
const invalidClickResult = invalidSubtreeHarness.click(createElementStub('format-button'), () => {
    invalidFormatCalled = true;
    invalidSubtreeHarness.context.handleFormat();
});
assert.equal(invalidClickResult.targetHandlerCalled, false, 'invalid pending subtree should stop the toolbar click');
assert.equal(invalidFormatCalled, false);
assert.equal(invalidSubtreeHarness.textarea.value, '{"name":');
assert.ok(invalidSubtreeHarness.textarea.focusCallCount >= 2, 'invalid subtree editor should stay focused');

function createRootNullEditHarness() {
    const harness = createHarness();
    harness.elements.get('json-input').value = '{"value":"before"}';
    harness.context.handleFormat();
    const rootNode = collectElements(
        harness.elements.get('json-output'),
        (element) => element.dataset.path === '[]'
    )[0];
    harness.context.handleEditSubtree(rootNode, [], { value: 'before' });
    const editor = rootNode.replacedWith;
    const textarea = collectElements(editor, (element) => element.className === 'subtree-textarea')[0];
    textarea.value = 'null';
    return harness;
}

for (const [label, action, expected] of [
    ['编辑', (harness) => harness.context.showEditor(), 'null'],
    ['压缩', (harness) => harness.context.handleMinify(), 'null'],
    ['格式化', (harness) => harness.context.handleFormat(), 'null'],
]) {
    const harness = createRootNullEditHarness();
    harness.click(createElementStub(`${label}-button`), () => action(harness));
    assert.equal(harness.elements.get('json-input').value, expected, `根值改为 null 后点击${label}应保留 null`);
}

const treeHistoryHarness = createHarness();
treeHistoryHarness.elements.get('json-input').value = '{"value":"before"}';
treeHistoryHarness.context.saveState();
treeHistoryHarness.context.handleFormat();
treeHistoryHarness.context.setValueByPathWithoutRerender(['value'], 'after');
treeHistoryHarness.context.undo();
assert.equal(treeHistoryHarness.elements.get('json-input').value, '{"value":"before"}');
treeHistoryHarness.context.redo();
assert.deepStrictEqual(JSON.parse(treeHistoryHarness.elements.get('json-input').value), { value: 'after' });

const editThenRepairHarness = createSubtreeEditHarness();
editThenRepairHarness.click(createElementStub('repair-button'), () => editThenRepairHarness.context.fixJson());
assert.deepStrictEqual(JSON.parse(editThenRepairHarness.elements.get('json-input').value), {
    profile: { name: 'after', enabled: false },
    keep: 1,
});

const sourceEditHarness = createHarness();
sourceEditHarness.elements.get('json-input').value = '{"value":"before"}';
sourceEditHarness.context.handleFormat();
sourceEditHarness.context.showEditor();
sourceEditHarness.elements.get('json-input').value = '{"value":"after"}';
sourceEditHarness.context.showEditor();
assert.equal(sourceEditHarness.elements.get('json-input').value, '{"value":"after"}');

function createDeferredDeleteHarness() {
    const harness = createHarness();
    harness.elements.get('json-input').value = '{"profile":{"name":"kept","remove":true},"keep":1}';
    harness.context.handleFormat();
    const rootNode = collectElements(
        harness.elements.get('json-output'),
        (element) => element.dataset.path === '[]'
    )[0];
    rootNode.classList.add('collapsed');
    harness.context.handleDelete(['profile', 'remove']);
    assert.equal(JSON.parse(harness.elements.get('json-input').value).profile.remove, true, 'collapsed delete should defer source synchronization');
    return harness;
}

for (const [label, action] of [
    ['编辑', (harness) => harness.context.showEditor()],
    ['压缩', (harness) => harness.context.handleMinify()],
    ['格式化', (harness) => harness.context.handleFormat()],
]) {
    const harness = createDeferredDeleteHarness();
    action(harness);
    const result = JSON.parse(harness.elements.get('json-input').value);
    assert.equal(Object.hasOwn(result.profile, 'remove'), false, `删除后点击${label}不应恢复旧字段`);
}

console.log('json parser repair guards passed');
