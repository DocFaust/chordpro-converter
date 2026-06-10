import { describe, it, expect } from "vitest";
import { parseLabeledLine, labelToDirective } from "../src/converter/sections.js";

describe("parseLabeledLine", () => {
    it("parses section labels with optional rest text", () => {
        expect(parseLabeledLine("[Chorus] extra")).toEqual({
            label: "Chorus",
            rest: "extra",
        });
    });

    it("returns null for non-section lines", () => {
        expect(parseLabeledLine("plain lyrics")).toBeNull();
    });
});

describe("labelToDirective", () => {
    it("maps German section names", () => {
        expect(labelToDirective("Refrain")).toEqual({ directive: "soc", label: "Refrain" });
        expect(labelToDirective("Strophe 2")).toEqual({ directive: "sov", label: "Strophe 2" });
    });

    it("maps generic sections to comment directive", () => {
        expect(labelToDirective("Intro")).toEqual({ directive: "c", label: "Intro" });
    });
});
