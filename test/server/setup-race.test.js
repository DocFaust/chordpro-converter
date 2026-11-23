import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Worker } from "node:worker_threads";
import { afterEach, describe, expect, it } from "vitest";
import { createInitialAdministrator } from "../../server/accounts.js";
import { buildApp } from "../../server/app.js";
import { openDatabase } from "../../server/db.js";
import { AccountError } from "../../server/errors.js";

const directories = [];
const TOKEN = "test-setup-token";
const PASSWORD = "plain-secret-qf7";

function temporaryDirectory() {
    const directory = mkdtempSync(path.join(tmpdir(), "cpc-race-"));
    directories.push(directory);
    return directory;
}

function runWorker(databasePath, input) {
    return new Promise((resolve, reject) => {
        const worker = new Worker(pathToFileURL(path.resolve("test/server/setup-race-worker.js")), {
            workerData: { databasePath, input },
        });
        let message;
        worker.on("message", (value) => {
            message = value;
        });
        worker.on("error", reject);
        worker.on("exit", (code) => {
            if (message) {
                resolve(message);
                return;
            }
            reject(new Error(`Worker beendet mit Code ${code}`));
        });
    });
}

afterEach(() => {
    while (directories.length > 0) {
        rmSync(directories.pop(), { recursive: true, force: true });
    }
});

describe("atomare Ersteinrichtung", () => {
    it("lässt konkurrierende Einrichtungen nur einen Administrator anlegen", async () => {
        const databasePath = path.join(temporaryDirectory(), "cpc.sqlite");
        const prepared = openDatabase(databasePath);
        prepared.close();
        const started = Date.now();
        const results = await Promise.all([
            runWorker(databasePath, {
                username: "Ada",
                password: PASSWORD,
                setupToken: TOKEN,
                expectedToken: TOKEN,
                pauseMs: 400,
            }),
            runWorker(databasePath, {
                username: "Bea",
                password: PASSWORD,
                setupToken: TOKEN,
                expectedToken: TOKEN,
                pauseMs: 400,
            }),
        ]);
        expect(Date.now() - started).toBeGreaterThanOrEqual(700);
        const codes = results.map((result) => (result.ok ? "created" : result.code)).sort();
        expect(codes).toEqual(["created", "setup_complete"]);
        const database = openDatabase(databasePath);
        const rows = database.prepare("SELECT username, administrator FROM accounts ORDER BY id").all();
        expect(rows).toHaveLength(1);
        expect(rows[0].administrator).toBe(1);
        expect(database.prepare("SELECT COUNT(*) AS count FROM setup_guard").get().count).toBe(1);
        database.close();
    }, 15000);

    it("legt auch bei parallelen HTTP-Anfragen nur ein Konto an", async () => {
        const database = openDatabase(path.join(temporaryDirectory(), "cpc.sqlite"));
        const app = buildApp(database, { setupToken: TOKEN });
        const headers = {
            host: "127.0.0.1:3000",
            origin: "http://127.0.0.1:3000",
            "content-type": "application/json",
            "x-cpc-request": "1",
        };
        const [first, second] = await Promise.all([
            app.inject({
                method: "POST",
                url: "/api/setup",
                headers,
                payload: { username: "Ada", password: PASSWORD, setupToken: TOKEN },
            }),
            app.inject({
                method: "POST",
                url: "/api/setup",
                headers,
                payload: { username: "Bea", password: PASSWORD, setupToken: TOKEN },
            }),
        ]);
        expect([first.statusCode, second.statusCode].sort()).toEqual([201, 409]);
        expect(database.prepare("SELECT COUNT(*) AS count FROM accounts").get().count).toBe(1);
        await app.close();
        database.close();
    });

    it("bleibt bei einem belegten Einrichtungssperrensatz ohne Konto", () => {
        const database = openDatabase(path.join(temporaryDirectory(), "cpc.sqlite"));
        database.prepare("INSERT INTO setup_guard (id) VALUES (1)").run();
        let caught;
        try {
            createInitialAdministrator(database, {
                username: "Ada",
                password: PASSWORD,
                setupToken: TOKEN,
                expectedToken: TOKEN,
            });
        } catch (error) {
            caught = error;
        }
        expect(caught).toBeInstanceOf(AccountError);
        expect(caught.code).toBe("setup_complete");
        expect(database.prepare("SELECT COUNT(*) AS count FROM accounts").get().count).toBe(0);
        database.close();
    });

    it("bricht ab, wenn die Datenbank die Schreibsperre nicht hergibt", () => {
        const databasePath = path.join(temporaryDirectory(), "cpc.sqlite");
        const holder = openDatabase(databasePath);
        holder.exec("BEGIN IMMEDIATE");
        const other = openDatabase(databasePath);
        other.exec("PRAGMA busy_timeout = 0");
        expect(() => createInitialAdministrator(other, {
            username: "Ada",
            password: PASSWORD,
            setupToken: TOKEN,
            expectedToken: TOKEN,
        })).toThrow(/busy|locked/i);
        holder.exec("ROLLBACK");
        holder.close();
        other.close();
    });
});
