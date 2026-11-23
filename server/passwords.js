import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LENGTH = 32;

let timingPadHash;

function timingPad() {
    if (!timingPadHash) {
        timingPadHash = hashPassword("timing-pad");
    }
    return timingPadHash;
}

export function hashPassword(password) {
    const salt = randomBytes(16);
    const hash = scryptSync(password, salt, KEY_LENGTH, {
        N: SCRYPT_N,
        r: SCRYPT_R,
        p: SCRYPT_P,
    });
    return [
        "scrypt",
        SCRYPT_N,
        SCRYPT_R,
        SCRYPT_P,
        salt.toString("base64url"),
        hash.toString("base64url"),
    ].join(":");
}

export function verifyPassword(password, stored) {
    if (typeof password !== "string" || typeof stored !== "string") {
        return false;
    }
    const parts = stored.split(":");
    if (parts.length !== 6 || parts[0] !== "scrypt") {
        return false;
    }
    const n = Number(parts[1]);
    const r = Number(parts[2]);
    const p = Number(parts[3]);
    if (n !== SCRYPT_N || r !== SCRYPT_R || p !== SCRYPT_P) {
        return false;
    }
    try {
        const salt = Buffer.from(parts[4], "base64url");
        const expected = Buffer.from(parts[5], "base64url");
        if (salt.length === 0 || expected.length !== KEY_LENGTH) {
            return false;
        }
        const actual = scryptSync(password, salt, expected.length, { N: n, r, p });
        return timingSafeEqual(actual, expected);
    } catch {
        return false;
    }
}

export function tokensMatch(provided, expected) {
    if (typeof expected !== "string" || expected.length === 0 || typeof provided !== "string") {
        return false;
    }
    const left = createHash("sha256").update(provided).digest();
    const right = createHash("sha256").update(expected).digest();
    return timingSafeEqual(left, right);
}

export function consumeTimingPad(password) {
    verifyPassword(password, timingPad());
}

export const USERNAME_MAX_LENGTH = 64;
export const PASSWORD_MAX_LENGTH = 128;

export function normalizeUsername(username) {
    if (typeof username !== "string") {
        return null;
    }
    const trimmed = username.trim();
    if (trimmed.length === 0 || trimmed.length > USERNAME_MAX_LENGTH) {
        return null;
    }
    for (const character of trimmed) {
        const code = character.codePointAt(0);
        if (code <= 31 || code === 127) {
            return null;
        }
    }
    return {
        username: trimmed,
        usernameKey: trimmed.toLowerCase(),
    };
}

export function isValidPassword(password) {
    return typeof password === "string"
        && password.length > 0
        && password.length <= PASSWORD_MAX_LENGTH;
}
