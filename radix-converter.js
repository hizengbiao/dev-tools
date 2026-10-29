(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.RadixConverter = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    const DIGITS = '0123456789abcdefghijklmnopqrstuvwxyz';
    const MAX_DIGITS = 4096;
    const MAX_LINES = 200;
    const MAX_TEXT = 50000;
    function validateBase(base) {
        if (!Number.isInteger(base) || base < 2 || base > 36) throw new Error('进制必须是 2–36 之间的整数。');
        return base;
    }
    function parseInteger(text, base) {
        validateBase(base);
        let digits = String(text).trim();
        if (!digits) throw new Error('请输入整数。');
        let sign = 1n;
        if (/^[+-]/.test(digits)) {
            if (digits[0] === '-') sign = -1n;
            digits = digits.slice(1);
        }
        if ([2, 8, 10, 16].includes(base)) {
            const prefix = digits.match(/^0([box])/i);
            if (prefix) {
                const prefixBase = { b: 2, o: 8, x: 16 }[prefix[1].toLowerCase()];
                if (base !== prefixBase) throw new Error('前缀与输入进制不一致，请选择 ' + prefixBase + ' 进制。');
                digits = digits.slice(2);
            }
        }
        if (!digits) throw new Error('符号或前缀后缺少数字。');
        if (digits.length > MAX_DIGITS * 2) throw new Error('每个整数最多支持 ' + MAX_DIGITS + ' 位数字。');
        if (!/^[0-9a-z]+(?:_[0-9a-z]+)*$/i.test(digits)) throw new Error('仅支持整数；下划线只能位于数字之间，不支持小数、空格或科学计数法。');
        digits = digits.replace(/_/g, '').toLowerCase();
        if (digits.length > MAX_DIGITS) throw new Error('每个整数最多支持 ' + MAX_DIGITS + ' 位数字。');
        let value = 0n;
        const radix = BigInt(base);
        for (const char of digits) {
            const digit = DIGITS.indexOf(char);
            if (digit >= base) throw new Error('字符“' + char + '”不属于 ' + base + ' 进制（可用字符：' + DIGITS.slice(0, base).toUpperCase() + '）。');
            value = value * radix + BigInt(digit);
        }
        return value * sign;
    }
    function formatInteger(value, base, options = {}) {
        validateBase(base);
        if (typeof value !== 'bigint') throw new Error('转换值必须是 BigInt 整数。');
        const sign = value < 0n ? '-' : '';
        let digits = (value < 0n ? -value : value).toString(base);
        if (options.uppercase !== false) digits = digits.toUpperCase();
        const prefix = options.prefix ? ({ 2: '0b', 8: '0o', 16: '0x' }[base] || '') : '';
        return sign + prefix + digits;
    }
    function convertBatch(text, sourceBase, targets, options = {}) {
        validateBase(sourceBase);
        targets.forEach(validateBase);
        text = String(text);
        if (text.length > MAX_TEXT) throw new Error('单次输入最多支持 ' + MAX_TEXT + ' 个字符。');
        const lines = text.split(/\r\n|\n|\r/).map((value, i) => ({ text: value.trim(), line: i + 1 })).filter(row => row.text);
        if (!lines.length) throw new Error('请输入需要转换的整数，一行一个。');
        if (lines.length > MAX_LINES) throw new Error('单次最多转换 ' + MAX_LINES + ' 个整数。');
        return lines.map(row => {
            try {
                const value = parseInteger(row.text, sourceBase);
                return { ...row, outputs: targets.map(base => formatInteger(value, base, options)) };
            } catch (error) {
                return { ...row, error: error.message };
            }
        });
    }
    return { parseInteger, formatInteger, convertBatch, validateBase, MAX_DIGITS, MAX_LINES, MAX_TEXT };
});
