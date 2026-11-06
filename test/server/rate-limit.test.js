import { describe, expect, it } from "vitest";
import { createRateLimiter } from "../../server/rate-limit.js";

describe("createRateLimiter", () => {
    it("lässt Versuche nach dem Zeitfenster wieder zu", () => {
        let now = 1_000;
        const limiter = createRateLimiter({ limit: 1, windowMs: 500, now: () => now });
        expect(limiter.check("ada")).toBe(true);
        limiter.hit("ada");
        expect(limiter.check("ada")).toBe(false);
        now = 1_500;
        expect(limiter.check("ada")).toBe(true);
        limiter.hit("ada");
        limiter.reset("ada");
        expect(limiter.check("ada")).toBe(true);
    });
});
