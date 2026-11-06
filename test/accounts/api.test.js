import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
    ApiError,
    loadSession,
    login,
    logout,
    messageFor,
} from "../../src/accounts/api.js";

function walk(directory) {
    return readdirSync(directory).flatMap((name) => {
        const fullPath = path.join(directory, name);
        if (statSync(fullPath).isDirectory()) {
            return walk(fullPath);
        }
        return fullPath.endsWith(".js") || fullPath.endsWith(".jsx") ? [fullPath] : [];
    });
}

function jsonResponse(body, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { "content-type": "application/json" },
    });
}

afterEach(() => {
    vi.unstubAllGlobals();
});

describe("Konten-API", () => {
    it("sendet schreibende Anfragen same-origin mit dem CSRF-Header", async () => {
        const fetchMock = vi.fn(async () => jsonResponse({
            id: 1,
            username: "Ada",
            administrator: true,
            disabled: false,
            mustChangePassword: false,
        }));
        vi.stubGlobal("fetch", fetchMock);
        await login({ username: "Ada", password: "geheim" });
        expect(fetchMock).toHaveBeenCalledWith("/api/login", expect.objectContaining({
            method: "POST",
            credentials: "same-origin",
            body: JSON.stringify({ username: "Ada", password: "geheim" }),
            headers: expect.objectContaining({
                "Content-Type": "application/json",
                "X-CPC-Request": "1",
            }),
        }));
        fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
        await expect(logout()).resolves.toBeNull();
    });

    it("mappt Fehlercodes und leitet die Sitzungsphase ab", async () => {
        expect(messageFor("origin_missing")).toMatch(/Origin fehlt/);
        expect(messageFor("unbekannt")).toMatch(/fehlgeschlagen/);
        const fetchMock = vi.fn()
            .mockResolvedValueOnce(jsonResponse({ setupRequired: true }))
            .mockResolvedValueOnce(jsonResponse({ setupRequired: false }))
            .mockResolvedValueOnce(jsonResponse({ error: "unauthenticated" }, 401))
            .mockResolvedValueOnce(jsonResponse({ setupRequired: false }))
            .mockResolvedValueOnce(jsonResponse({
                id: 2,
                username: "Ben",
                administrator: false,
                disabled: false,
                mustChangePassword: true,
            }));
        vi.stubGlobal("fetch", fetchMock);
        await expect(loadSession()).resolves.toEqual({ phase: "setup", account: null });
        await expect(loadSession()).resolves.toEqual({ phase: "login", account: null });
        await expect(loadSession()).resolves.toMatchObject({ phase: "mustChange" });
        fetchMock.mockRejectedValueOnce(new Error("offline"));
        await expect(login({ username: "Ada", password: "geheim" })).rejects.toMatchObject({
            status: 0,
            code: "network_error",
        });
        fetchMock.mockResolvedValueOnce(jsonResponse({}, 500));
        await expect(login({ username: "Ada", password: "geheim" })).rejects.toBeInstanceOf(ApiError);
    });
});

describe("Quellgrenzen", () => {
    it("legt das Setup-Token und keinen E-Mail-Weg in die Anwendung", () => {
        const source = [...walk(path.resolve("src")), ...walk(path.resolve("server"))]
            .map((file) => readFileSync(file, "utf8"))
            .join("\n");
        expect(walk(path.resolve("src")).map((file) => readFileSync(file, "utf8")).join("\n")).not.toContain("SETUP_TOKEN");
        expect(source).not.toContain("nodemailer");
        expect(source).not.toContain("mailto:");
    });
});
