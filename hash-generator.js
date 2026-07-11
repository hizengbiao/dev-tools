(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }
    root.HashGenerator = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    const ALGORITHMS = ['MD5', 'SHA-1', 'SHA-256', 'SHA-512'];

    function bytesToHex(bytes) {
        return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
    }

    function stringToBytes(text) {
        return new TextEncoder().encode(String(text ?? ''));
    }

    function leftRotate(value, shift) {
        return ((value << shift) | (value >>> (32 - shift))) >>> 0;
    }

    function add32(...values) {
        return values.reduce((sum, value) => (sum + value) >>> 0, 0);
    }

    function wordToBytesLE(word) {
        return [
            word & 0xff,
            (word >>> 8) & 0xff,
            (word >>> 16) & 0xff,
            (word >>> 24) & 0xff,
        ];
    }

    function md5Bytes(inputBytes) {
        const input = Array.from(inputBytes ?? []);
        const bitLength = input.length * 8;
        input.push(0x80);
        while (input.length % 64 !== 56) {
            input.push(0);
        }
        for (let index = 0; index < 8; index += 1) {
            input.push(Math.floor(bitLength / (2 ** (8 * index))) & 0xff);
        }

        const shifts = [
            7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
            5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
            4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
            6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
        ];
        const constants = Array.from({ length: 64 }, (_, index) => (
            Math.floor(Math.abs(Math.sin(index + 1)) * 2 ** 32) >>> 0
        ));

        let a0 = 0x67452301;
        let b0 = 0xefcdab89;
        let c0 = 0x98badcfe;
        let d0 = 0x10325476;

        for (let offset = 0; offset < input.length; offset += 64) {
            const words = [];
            for (let index = 0; index < 16; index += 1) {
                const base = offset + index * 4;
                words[index] = (
                    input[base]
                    | (input[base + 1] << 8)
                    | (input[base + 2] << 16)
                    | (input[base + 3] << 24)
                ) >>> 0;
            }

            let a = a0;
            let b = b0;
            let c = c0;
            let d = d0;

            for (let index = 0; index < 64; index += 1) {
                let f;
                let g;
                if (index < 16) {
                    f = (b & c) | (~b & d);
                    g = index;
                } else if (index < 32) {
                    f = (d & b) | (~d & c);
                    g = (5 * index + 1) % 16;
                } else if (index < 48) {
                    f = b ^ c ^ d;
                    g = (3 * index + 5) % 16;
                } else {
                    f = c ^ (b | ~d);
                    g = (7 * index) % 16;
                }
                const next = d;
                d = c;
                c = b;
                b = add32(b, leftRotate(add32(a, f, constants[index], words[g]), shifts[index]));
                a = next;
            }

            a0 = add32(a0, a);
            b0 = add32(b0, b);
            c0 = add32(c0, c);
            d0 = add32(d0, d);
        }

        return bytesToHex([
            ...wordToBytesLE(a0),
            ...wordToBytesLE(b0),
            ...wordToBytesLE(c0),
            ...wordToBytesLE(d0),
        ]);
    }

    function getSubtleCrypto() {
        if (typeof crypto !== 'undefined' && crypto.subtle) {
            return crypto.subtle;
        }
        try {
            if (typeof require === 'function') {
                return require('node:crypto').webcrypto.subtle;
            }
        } catch (error) {
            return null;
        }
        return null;
    }

    async function shaDigest(bytes, algorithm) {
        const subtle = getSubtleCrypto();
        if (!subtle) {
            throw new Error('当前环境不支持 Web Crypto 摘要计算');
        }
        const digest = await subtle.digest(algorithm, bytes);
        return bytesToHex(new Uint8Array(digest));
    }

    async function hashBytes(bytes) {
        const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes ?? []);
        return {
            MD5: md5Bytes(data),
            'SHA-1': await shaDigest(data, 'SHA-1'),
            'SHA-256': await shaDigest(data, 'SHA-256'),
            'SHA-512': await shaDigest(data, 'SHA-512'),
        };
    }

    async function hashText(text) {
        return hashBytes(stringToBytes(text));
    }

    function normalizeHex(value) {
        return String(value ?? '').replace(/\s+/g, '').toLowerCase();
    }

    function compareHash(left, right) {
        const a = normalizeHex(left);
        const b = normalizeHex(right);
        return Boolean(a && b && a === b);
    }

    function formatBytes(bytes) {
        const value = Number(bytes) || 0;
        if (value === 0) return '0 B';
        const units = ['B', 'KB', 'MB', 'GB'];
        const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
        return `${Number((value / (1024 ** index)).toFixed(2))} ${units[index]}`;
    }

    return {
        ALGORITHMS,
        bytesToHex,
        md5Bytes,
        hashBytes,
        hashText,
        normalizeHex,
        compareHash,
        formatBytes,
    };
});
