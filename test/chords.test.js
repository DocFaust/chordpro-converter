import { describe, it, expect } from "vitest";
import {
    isChordLine,
    splitChordLinePreserveSpaces,
    wrapChordTokensPreservingSpaces,
} from "../src/converter/chords.js";

describe("splitChordLinePreserveSpaces", () => {
    it("splits on whitespace while keeping separators", () => {
        expect(splitChordLinePreserveSpaces("E   H7")).toEqual(["E", "   ", "H7"]);
    });
});

describe("wrapChordTokensPreservingSpaces", () => {
    it("wraps chord tokens and preserves spacing", () => {
        const parts = splitChordLinePreserveSpaces("E   H7");
        expect(wrapChordTokensPreservingSpaces(parts)).toBe("[E]   [H7]");
    });

    it("leaves whitespace-only parts unchanged", () => {
        expect(wrapChordTokensPreservingSpaces(["   "])).toBe("   ");
    });
});

describe("isChordLine edge cases", () => {
    it("accepts bar tokens", () => {
        expect(isChordLine("G | D")).toBe(true);
    });

    it("rejects empty lines", () => {
        expect(isChordLine("")).toBe(false);
        expect(isChordLine("   ")).toBe(false);
    });
});
