// test/convertToChordPro.test.js
import { describe, it, expect } from "vitest";
import { isChordLine } from "../src/converter/chords.js";
import { mergeChordAndText, convertToChordPro, headerDirectives, formatChordOnlyLine } from "../src/converter/convertToChordPro.js";

describe("chord detection", () => {
    it("recognizes simple chord lines", () => {
        expect(isChordLine("E   H7   A")).toBe(true);
        expect(isChordLine("G  D/F#  Em7  |  Cadd9")).toBe(true);
    });
    it("rejects text lines", () => {
        expect(isChordLine("This is just lyrics")).toBe(false);
        expect(isChordLine("Em sieht man hier nicht am Anfang des Satzes")).toBe(false);
    });
});

describe("mergeChordAndText", () => {
    it("inserts chords at whitespace offsets", () => {
        const chords = "E     H7    A";
        const text   = "Keinen Tag soll es geben";
        const merged = mergeChordAndText(chords, text);
        expect(merged).toContain("[E]");
        expect(merged).toContain("[H7]");
        expect(merged).toContain("[A]");
        expect(merged.length).toBeGreaterThan(text.length);
    });
});

describe("formatChordOnlyLine", () => {
    it("wraps individual chords", () => {
        expect(formatChordOnlyLine("E   H7   A")).toBe("[E] [H7] [A]");
    });
});

describe("headerDirectives", () => {
    it("emits valid headers", () => {
        const h = headerDirectives({ title: "Song", artist: "Werner", capo: 3, key: "E" });
        expect(h).toEqual(["{title: Song}", "{artist: Werner}", "{capo: 3}", "{key: E}"]);
    });
    it("validates key with German H", () => {
        const h = headerDirectives({ key: "H" });
        expect(h).toEqual(["{key: H}"]);
    });
});

describe("convertToChordPro end-to-end", () => {
    it("handles labeled sections, chord-only lines, and merges", () => {
        const input = [
            "[Chorus]",
            "E     H7    A",
            "Keinen Tag soll es geben",
            "",
            "[Verse 1]",
            "G   D/F#   Em7   |   Cadd9",
            "Dass du sagen musst",
            "",
            "[Intro]",
            "E  H7  A  E",
            "",
        ].join("\n");

        const out = convertToChordPro({ title: "Friede Gottes", artist: "Trad.", capo: 2, key: "E", input });

        expect(out).toContain("{soc: Chorus}");
        expect(out).toContain("{sov: Verse 1}");
        expect(out).toContain("{c: Intro}");
        expect(out).toMatch(/\[E\].*\[H7\].*\[A\]/);
        expect(out).toContain("[E] [H7] [A] [E]");
    });
});

describe("multiple chord-only lines", () => {
    it("converts consecutive chord-only lines correctly", () => {
        const input = [
            "G D C G",
            "G D C G",
            "G C D G"
        ].join("\n");

        const expected = [
            "[G] [D] [C] [G]",
            "[G] [D] [C] [G]",
            "[G] [C] [D] [G]"
        ].join("\n");

        const out = convertToChordPro({ input });

        expect(out.trim()).toBe(expected);
    });
});

