(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }
    root.RandomGenerator = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    const LOWER = 'abcdefghijklmnopqrstuvwxyz';
    const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const DIGITS = '0123456789';
    const SYMBOLS = '!@#$%^&*()_+-=[]{};:,.<>?';

    function defaultRandomBytes(length) {
        const bytes = new Uint8Array(length);
        if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
            crypto.getRandomValues(bytes);
            return bytes;
        }
        try {
            if (typeof require === 'function') {
                return require('node:crypto').randomBytes(length);
            }
        } catch (error) {
            // fallback below
        }
        return Uint8Array.from({ length }, () => Math.floor(Math.random() * 256));
    }

    function generateUuidV4(randomBytes = defaultRandomBytes) {
        const bytes = Uint8Array.from(randomBytes(16));
        bytes[6] = (bytes[6] & 0x0f) | 0x40;
        bytes[8] = (bytes[8] & 0x3f) | 0x80;
        const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0'));
        return [
            hex.slice(0, 4).join(''),
            hex.slice(4, 6).join(''),
            hex.slice(6, 8).join(''),
            hex.slice(8, 10).join(''),
            hex.slice(10, 16).join(''),
        ].join('-');
    }

    function getCharacterSet(options = {}) {
        let result = '';
        if (options.lower !== false) result += LOWER;
        if (options.upper) result += UPPER;
        if (options.digits !== false) result += DIGITS;
        if (options.symbols) result += SYMBOLS;
        return result;
    }

    function generateRandomString(length, charset, random = Math.random) {
        if (!Number.isInteger(length) || length <= 0) {
            throw new TypeError('length must be positive');
        }
        if (!charset) {
            throw new TypeError('charset is required');
        }
        return Array.from({ length }, () => charset[Math.min(charset.length - 1, Math.floor(random() * charset.length))]).join('');
    }

    function generateRandomIntegers(options = {}, random = Math.random) {
        const count = Number(options.count);
        const min = Number(options.min);
        const max = Number(options.max);
        if (!Number.isInteger(count) || count <= 0) {
            throw new TypeError('count must be positive');
        }
        if (!Number.isFinite(min) || !Number.isFinite(max) || min > max) {
            throw new TypeError('invalid min/max');
        }
        return Array.from({ length: count }, () => Math.floor(random() * (max - min + 1)) + min);
    }

    function generateBatch(options = {}, random = Math.random, randomBytes = defaultRandomBytes) {
        const type = options.type || 'uuid';
        const count = Number(options.count);
        if (!Number.isInteger(count) || count <= 0) {
            throw new TypeError('count must be positive');
        }
        if (type === 'uuid') {
            return Array.from({ length: count }, () => generateUuidV4(randomBytes));
        }
        if (type === 'number') {
            return generateRandomIntegers(options, random).map(String);
        }
        const length = Number(options.length);
        if (Object.prototype.hasOwnProperty.call(options, 'charset') && !options.charset) {
            throw new TypeError('charset is required');
        }
        const charset = options.charset || getCharacterSet(options);
        if (!Number.isInteger(length) || length <= 0) {
            throw new TypeError('length must be positive');
        }
        return Array.from({ length: count }, () => generateRandomString(length, charset, random));
    }

    return {
        LOWER,
        UPPER,
        DIGITS,
        SYMBOLS,
        defaultRandomBytes,
        generateUuidV4,
        getCharacterSet,
        generateRandomString,
        generateRandomIntegers,
        generateBatch,
    };
});
