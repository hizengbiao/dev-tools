const assert = require('node:assert');
const path = require('node:path');

const RegexRiskAnalyzer = require(path.resolve(__dirname, '../regex-risk-analyzer.js'));

let risks = RegexRiskAnalyzer.analyzeRegexRisks('(a+)+$');
assert.equal(risks.length, 1);
assert.equal(risks[0].type, 'nested-quantifier');
assert.equal(risks[0].fragment, '(a+)+');
assert.match(risks[0].reason, /nested quantifier/i);

risks = RegexRiskAnalyzer.analyzeRegexRisks('(a|aa)+$');
assert.equal(risks.length, 1);
assert.equal(risks[0].type, 'overlapping-alternation');
assert.equal(risks[0].fragment, '(a|aa)+');
assert.match(risks[0].reason, /overlapping alternation/i);

risks = RegexRiskAnalyzer.analyzeRegexRisks('^(1[3-9]\\d{2})\\d{3}(\\d{4})$');
assert.deepEqual(risks, []);

risks = RegexRiskAnalyzer.analyzeRegexRisks('\\(a+\\)+');
assert.deepEqual(risks, []);

console.log('regex risk analyzer tests passed');
