const crypto = require('crypto');

const DEFAULT_TTL_SECONDS = 300;
const MAX_TTL_SECONDS = 3600;
const DEV_FALLBACK_SECRET = 'local-dev-resource-link-secret';

function getSecret() {
    return process.env.RESOURCE_LINK_SECRET || DEV_FALLBACK_SECRET;
}

function getTtlSeconds() {
    const raw = Number.parseInt(process.env.RESOURCE_LINK_TTL_SECONDS || '', 10);
    if (!Number.isInteger(raw) || raw <= 0) {
        return DEFAULT_TTL_SECONDS;
    }

    return Math.min(raw, MAX_TTL_SECONDS);
}

function sign(resourceId, expiresAt) {
    return crypto
        .createHmac('sha256', getSecret())
        .update(`${resourceId}:${expiresAt}`)
        .digest('hex');
}

function safeEqualHex(left, right) {
    if (typeof left !== 'string' || typeof right !== 'string' || left.length !== right.length) {
        return false;
    }

    if (!/^[0-9a-f]+$/i.test(left) || !/^[0-9a-f]+$/i.test(right) || left.length % 2 !== 0) {
        return false;
    }

    return crypto.timingSafeEqual(Buffer.from(left, 'hex'), Buffer.from(right, 'hex'));
}

function createResourceToken(resourceId) {
    const expiresAt = Math.floor(Date.now() / 1000) + getTtlSeconds();
    return {
        expiresAt,
        signature: sign(resourceId, expiresAt)
    };
}

function verifyResourceToken(resourceId, expiresAtRaw, signature) {
    const expiresAt = Number.parseInt(expiresAtRaw, 10);
    if (!Number.isInteger(expiresAt)) {
        return false;
    }

    const now = Math.floor(Date.now() / 1000);
    if (expiresAt < now) {
        return false;
    }

    const expectedSignature = sign(resourceId, expiresAt);
    return safeEqualHex(expectedSignature, signature);
}

module.exports = {
    createResourceToken,
    verifyResourceToken
};