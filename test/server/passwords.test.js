import { describe, expect, it } from "vitest";
import {
    hashPassword,
    isValidPassword,
    normalizeUsername,
    tokensMatch,
    verifyPassword,
} from "../../server/passwords.js";

describe("Passwörter", () => {
    it("prüft einen Hash und lehnt Abweichungen ab", () => {
        const stored = hashPassword("richtig");
        expect(stored.startsWith("scrypt:")).toBe(true);
        expect(stored).not.toContain("richtig");
        expect(verifyPassword("richtig", stored)).toBe(true);
        expect(verifyPassword("falsch", stored)).toBe(false);
        expect(verifyPassword("", stored)).toBe(false);
        expect(verifyPassword("richtig", "klartext")).toBe(false);
        expect(verifyPassword("richtig", "scrypt:1:8:1:aa:bb")).toBe(false);
        expect(verifyPassword("richtig", "scrypt:16384:8:1:!!!:abcd")).toBe(false);
        expect(verifyPassword(undefined, stored)).toBe(false);
    });
});

describe("tokensMatch", () => {
    it("vergleicht unabhängig von der Länge, ohne ein leeres erwartetes Token anzunehmen", () => {
        expect(tokensMatch("gleich", "gleich")).toBe(true);
        expect(tokensMatch("kurz", "deutlich-länger")).toBe(false);
        expect(tokensMatch("wert", "")).toBe(false);
        expect(tokensMatch(undefined, "wert")).toBe(false);
    });
});

describe("normalizeUsername", () => {
    it("behält die Schreibweise und bildet den Vergleichsschlüssel", () => {
        expect(normalizeUsername("  Joshi  ")).toEqual({ username: "Joshi", usernameKey: "joshi" });
        expect(normalizeUsername("")).toBeNull();
        expect(normalizeUsername("a\nb")).toBeNull();
        expect(normalizeUsername("a\u007fb")).toBeNull();
        expect(normalizeUsername("a".repeat(65))).toBeNull();
        expect(isValidPassword("")).toBe(false);
        expect(isValidPassword("a".repeat(129))).toBe(false);
        expect(isValidPassword(" geheim ")).toBe(true);
    });
});
