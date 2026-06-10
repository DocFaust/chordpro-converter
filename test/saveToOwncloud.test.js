import { describe, it, expect, vi, beforeEach } from "vitest";
import axios from "axios";

vi.mock("axios");

describe("saveFile", () => {
    beforeEach(() => {
        vi.resetModules();
        vi.clearAllMocks();
    });

    it("uploads file on success", async () => {
        axios.put.mockResolvedValue({ status: 201 });
        const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

        const { saveFile } = await import("../src/saveToOwncloud.js");
        await saveFile("song.chord", "content");

        expect(axios.put).toHaveBeenCalledWith(
            "https://owncloud.docfaust.de/remote.php/dav/files/wfaust/song.chord",
            "content",
            expect.objectContaining({
                headers: expect.objectContaining({
                    Authorization: expect.stringContaining("Bearer"),
                    "Content-Type": "text/plain",
                }),
            })
        );
        expect(logSpy).toHaveBeenCalledWith("Uploaded");
        logSpy.mockRestore();
    });

    it("logs error when upload fails", async () => {
        axios.put.mockRejectedValue(new Error("network"));
        const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

        const { saveFile } = await import("../src/saveToOwncloud.js");
        await saveFile("song.chord", "content");

        expect(errorSpy).toHaveBeenCalled();
        errorSpy.mockRestore();
    });

    it("logs failure for unexpected status", async () => {
        axios.put.mockResolvedValue({ status: 500 });
        const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

        const { saveFile } = await import("../src/saveToOwncloud.js");
        await saveFile("song.chord", "content");

        expect(errorSpy).toHaveBeenCalledWith("Upload failed");
        errorSpy.mockRestore();
    });
});
