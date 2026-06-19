import { describe, it, expect, vi, beforeEach } from "vitest";
import axios from "axios";

vi.mock("axios");

const PROPFIND_XML = `<?xml version="1.0"?>
<d:multistatus xmlns:d="DAV:">
  <d:response>
    <d:href>/remote.php/dav/files/user/</d:href>
    <d:propstat><d:prop><d:resourcetype><d:collection/></d:resourcetype></d:prop></d:propstat>
  </d:response>
  <d:response>
    <d:href>/remote.php/dav/files/user/Band/</d:href>
    <d:propstat><d:prop><d:resourcetype><d:collection/></d:resourcetype></d:prop></d:propstat>
  </d:response>
  <d:response>
    <d:href>/remote.php/dav/files/user/Band/song.chord</d:href>
    <d:propstat><d:prop><d:resourcetype/></d:prop></d:propstat>
  </d:response>
</d:multistatus>`;

describe("nextcloud client", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("buildDavUrl normalizes base URL and encodes path segments", async () => {
        const { buildDavUrl } = await import("../../src/nextcloud/client.js");
        expect(buildDavUrl("https://cloud.example.com/", "user", "Band/ChordPro"))
            .toBe("https://cloud.example.com/remote.php/dav/files/user/Band/ChordPro");
    });

    it("sanitizeFileName replaces invalid characters", async () => {
        const { sanitizeFileName } = await import("../../src/nextcloud/client.js");
        expect(sanitizeFileName("My/Song: Title")).toBe("My_Song_ Title.chord");
        expect(sanitizeFileName("")).toBe("chordpro_file.chord");
    });

    it("parseFolderList returns only folders", async () => {
        const { parseFolderList } = await import("../../src/nextcloud/client.js");
        expect(parseFolderList(PROPFIND_XML)).toEqual(["Band", "user"]);
    });

    it("listFolders returns folder names on success", async () => {
        axios.request.mockResolvedValue({ data: PROPFIND_XML });
        const { listFolders } = await import("../../src/nextcloud/client.js");
        const config = {
            baseUrl: "https://cloud.example.com",
            username: "user",
            password: "pass",
        };

        await expect(listFolders(config, "")).resolves.toEqual(["Band"]);
        expect(axios.request).toHaveBeenCalledWith(expect.objectContaining({
            method: "PROPFIND",
            headers: expect.objectContaining({
                Authorization: expect.stringContaining("Basic"),
            }),
        }));
    });

    it("listFolders throws on 401", async () => {
        axios.request.mockRejectedValue({ response: { status: 401 } });
        const { listFolders } = await import("../../src/nextcloud/client.js");

        await expect(listFolders({
            baseUrl: "https://cloud.example.com",
            username: "user",
            password: "wrong",
        }, "")).rejects.toThrow("Ungültige Anmeldedaten");
    });

    it("uploadFile succeeds on status 201", async () => {
        axios.put.mockResolvedValue({ status: 201 });
        const { uploadFile } = await import("../../src/nextcloud/client.js");
        const config = {
            baseUrl: "https://cloud.example.com",
            username: "user",
            password: "pass",
        };

        await uploadFile(config, "Band", "song.chord", "content");
        expect(axios.put).toHaveBeenCalledWith(
            "https://cloud.example.com/remote.php/dav/files/user/Band/song.chord",
            "content",
            expect.objectContaining({
                headers: expect.objectContaining({
                    Authorization: expect.stringContaining("Basic"),
                    "Content-Type": "text/plain",
                }),
            })
        );
    });

    it("uploadFile throws on 404", async () => {
        axios.put.mockRejectedValue({ response: { status: 404 } });
        const { uploadFile } = await import("../../src/nextcloud/client.js");

        await expect(uploadFile({
            baseUrl: "https://cloud.example.com",
            username: "user",
            password: "pass",
        }, "Missing", "song.chord", "content")).rejects.toThrow("Ordner nicht gefunden");
    });

    it("uploadFile throws on network error", async () => {
        axios.put.mockRejectedValue({ code: "ERR_NETWORK" });
        const { uploadFile } = await import("../../src/nextcloud/client.js");

        await expect(uploadFile({
            baseUrl: "https://cloud.example.com",
            username: "user",
            password: "pass",
        }, "Band", "song.chord", "content")).rejects.toThrow("Netzwerkfehler");
    });

    it("uploadFile succeeds on status 200", async () => {
        axios.put.mockResolvedValue({ status: 200 });
        const { uploadFile } = await import("../../src/nextcloud/client.js");

        await expect(uploadFile({
            baseUrl: "https://cloud.example.com",
            username: "user",
            password: "pass",
        }, "Band", "song.chord", "content")).resolves.toBeUndefined();
    });
});
