import { describe, it, expect, beforeEach } from "vitest";
import { loadSettings, saveSettings, hasValidSettings } from "../../src/nextcloud/settings.js";

describe("nextcloud settings", () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it("returns null when localStorage is empty", () => {
        expect(loadSettings()).toBeNull();
    });

    it("saves and loads settings", () => {
        const settings = {
            baseUrl: "https://cloud.example.com",
            username: "banduser",
            password: "secret",
            folderPath: "Band/ChordPro",
        };
        saveSettings(settings);
        expect(loadSettings()).toEqual(settings);
    });

    it("hasValidSettings returns true when all fields are set", () => {
        expect(hasValidSettings({
            baseUrl: "https://cloud.example.com",
            username: "banduser",
            password: "secret",
            folderPath: "Band",
        })).toBe(true);
    });

    it("hasValidSettings returns false when folder is missing", () => {
        expect(hasValidSettings({
            baseUrl: "https://cloud.example.com",
            username: "banduser",
            password: "secret",
            folderPath: "",
        })).toBe(false);
    });

    it("hasValidSettings returns false when password is empty", () => {
        expect(hasValidSettings({
            baseUrl: "https://cloud.example.com",
            username: "banduser",
            password: "  ",
            folderPath: "Band",
        })).toBe(false);
    });
});
