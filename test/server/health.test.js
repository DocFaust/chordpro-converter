import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildApp } from "../../server/app.js";
import { openDatabase } from "../../server/db.js";

const directories = [];

function temporaryDirectory() {
    const directory = mkdtempSync(path.join(tmpdir(), "cpc-health-"));
    directories.push(directory);
    return directory;
}

afterEach(() => {
    while (directories.length > 0) {
        rmSync(directories.pop(), { recursive: true, force: true });
    }
});

describe("GET /api/health", () => {
    it("antwortet ohne Fachdaten, wenn die Datenbank erreichbar ist", async () => {
        const database = openDatabase(path.join(temporaryDirectory(), "cpc.sqlite"));
        const app = buildApp(database);
        const response = await app.inject({ method: "GET", url: "/api/health" });

        expect(response.statusCode).toBe(200);
        expect(response.json()).toEqual({ status: "ok" });

        await app.close();
        database.close();
    });

    it("meldet die Datenbank als nicht erreichbar", async () => {
        const database = openDatabase(path.join(temporaryDirectory(), "cpc.sqlite"));
        database.close();
        const app = buildApp(database);
        const response = await app.inject({ method: "GET", url: "/api/health" });

        expect(response.statusCode).toBe(503);
        expect(response.json()).toEqual({ status: "unavailable" });
        await app.close();
    });
});
