export const LOGIN_ACCOUNT_LIMIT = 10;
export const LOGIN_IP_LIMIT = 50;
export const SETUP_IP_LIMIT = 10;
export const RATE_WINDOW_MS = 15 * 60 * 1000;

export function createRateLimiter({ limit, windowMs, now = () => Date.now() }) {
    const hits = new Map();

    function recent(key) {
        const current = now();
        const kept = (hits.get(key) ?? []).filter((timestamp) => current - timestamp < windowMs);
        hits.set(key, kept);
        return kept;
    }

    return {
        check(key) {
            return recent(key).length < limit;
        },
        hit(key) {
            const kept = recent(key);
            kept.push(now());
            hits.set(key, kept);
        },
        reset(key) {
            hits.delete(key);
        },
    };
}
