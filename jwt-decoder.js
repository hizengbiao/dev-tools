(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }
    root.JwtDecoder = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    const TIME_FIELD_NAMES = new Set(['exp', 'iat', 'nbf', 'auth_time']);

    function base64UrlToBase64(value) {
        const normalized = String(value ?? '').replace(/-/g, '+').replace(/_/g, '/');
        if (!normalized || normalized.length % 4 === 1) {
            throw new Error('Invalid base64url segment');
        }
        return normalized + '='.repeat((4 - normalized.length % 4) % 4);
    }

    function decodeBase64UrlText(value) {
        const base64 = base64UrlToBase64(value);
        if (typeof Buffer !== 'undefined') {
            return Buffer.from(base64, 'base64').toString('utf8');
        }
        const binary = atob(base64);
        const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
        return new TextDecoder().decode(bytes);
    }

    function parseJwtJson(segment) {
        try {
            return JSON.parse(decodeBase64UrlText(segment));
        } catch (error) {
            throw new Error(`Invalid JWT JSON: ${error.message}`);
        }
    }

    function formatTimestamp(value) {
        const seconds = Number(value);
        if (!Number.isFinite(seconds)) {
            return '';
        }
        return new Date(seconds * 1000).toISOString();
    }

    function collectTimeFields(payload) {
        const result = {};
        for (const [key, value] of Object.entries(payload || {})) {
            if (TIME_FIELD_NAMES.has(key) && Number.isFinite(Number(value))) {
                result[key] = {
                    seconds: Number(value),
                    iso: formatTimestamp(value),
                };
            }
        }
        return result;
    }

    function decodeJwt(token) {
        const parts = String(token ?? '').trim().split('.');
        if (parts.length !== 3) {
            throw new Error('JWT must contain 3 parts');
        }
        const header = parseJwtJson(parts[0]);
        const payload = parseJwtJson(parts[1]);
        const timeFields = collectTimeFields(payload);
        return {
            header,
            payload,
            signature: parts[2],
            timeFields,
            isExpired(now = new Date()) {
                if (!timeFields.exp) return false;
                return Number(now.getTime()) >= timeFields.exp.seconds * 1000;
            },
        };
    }

    return {
        base64UrlToBase64,
        decodeBase64UrlText,
        formatTimestamp,
        collectTimeFields,
        decodeJwt,
    };
});
