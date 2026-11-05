import http from "node:http";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveListenOptions, start } from "../../server/app.js";
import { isDirectRun, runDirect } from "../../server/index.js";

const directories = [];
const previousEnv = {
    DATABASE_PATH: process.env.DATABASE_PATH,
    HOST: process.env.HOST,
    PORT: process.env.PORT,
};

function temporaryDirectory() {
    const directory = mkdtempSync(path.join(tmpdir(), "cpc-start-"));
    directories.push(directory);
    return directory;
}

function restoreEnv() {
    for (const [name, value] of Object.entries(previousEnv)) {
        if (value === undefined) {
            delete process.env[name];
        } else {
            process.env[name] = value;
        }
    }
}

function getJson(url) {
    return new Promise((resolve, reject) => {
        const request = http.get(url, (response) => {
            const chunks = [];
            response.on("data", (chunk) => chunks.push(chunk));
            response.on("end", () => {
                resolve({
                    statusCode: response.statusCode,
                    body: JSON.parse(Buffer.concat(chunks).toString("utf8")),
                });
            });
        });
        request.on("error", reject);
    });
}

afterEach(() => {
    restoreEnv();
    while (directories.length > 0) {
        rmSync(directories.pop(), { recursive: true, force: true });
    }
});

describe("resolveListenOptions", () => {
    it("fällt auf 127.0.0.1 und Port 3000 zurück", () => {
        expect(resolveListenOptions({}, {})).toEqual({ host: "127.0.0.1", port: 3000 });
        expect(resolveListenOptions({}, { HOST: "", PORT: "" })).toEqual({ host: "127.0.0.1", port: 3000 });
    });

    it("übernimmt Host und Port aus der Umgebung oder den Optionen", () => {
        expect(resolveListenOptions({}, { HOST: "0.0.0.0", PORT: "4010" }))
            .toEqual({ host: "0.0.0.0", port: 4010 });
        expect(resolveListenOptions({ host: "127.0.0.1", port: 0 }, { HOST: "0.0.0.0", PORT: "4010" }))
            .toEqual({ host: "127.0.0.1", port: 0 });
    });
});

describe("start", () => {
    it("startet den Prozess, antwortet auf die Erreichbarkeitsprüfung und öffnet dieselbe Datei erneut", async () => {
        const databasePath = path.join(temporaryDirectory(), "cpc.sqlite");
        const first = await start({
            host: "127.0.0.1",
            port: 0,
            databasePath,
            logger: false,
        });

        const response = await first.app.inject({ method: "GET", url: "/api/health" });
        expect(response.statusCode).toBe(200);
        expect(response.json()).toEqual({ status: "ok" });
        await first.close();

        const second = await start({
            host: "127.0.0.1",
            port: 0,
            databasePath,
            logger: false,
        });
        const again = await second.app.inject({ method: "GET", url: "/api/health" });
        expect(again.statusCode).toBe(200);
        await second.close();
    });

    it("gibt den Port frei, wenn das Binden fehlschlägt", async () => {
        const directory = temporaryDirectory();
        const first = await start({
            host: "127.0.0.1",
            port: 0,
            databasePath: path.join(directory, "first.sqlite"),
        });

        await expect(start({
            host: "127.0.0.1",
            port: first.port,
            databasePath: path.join(directory, "second.sqlite"),
        })).rejects.toThrow();

        await first.close();
    });

    it("verwendet den konfigurierten Datenbankpfad aus der Umgebung", async () => {
        const databasePath = path.join(temporaryDirectory(), "env.sqlite");
        delete process.env.HOST;
        delete process.env.PORT;
        process.env.DATABASE_PATH = databasePath;

        const started = await start({ port: 0 });
        expect(started.databasePath).toBe(path.resolve(databasePath));
        expect(started.host).toBe("127.0.0.1");
        await started.close();
    });
});

describe("server/index.js", () => {
    const indexPath = path.resolve("server/index.js");

    it("erkennt den direkten Start", () => {
        expect(isDirectRun("")).toBe(false);
        expect(isDirectRun(indexPath)).toBe(true);
        expect(isDirectRun(path.resolve("test/server/start.test.js"))).toBe(false);
    });

    it("startet beim direkten Aufruf und meldet Fehler ohne die Laufzeit zu beenden", async () => {
        const databasePath = path.join(temporaryDirectory(), "direct.sqlite");
        process.env.DATABASE_PATH = databasePath;
        process.env.HOST = "127.0.0.1";
        process.env.PORT = "0";

        const started = await runDirect(indexPath);
        const response = await getJson(`http://${started.host}:${started.port}/api/health`);
        expect(response).toEqual({ statusCode: 200, body: { status: "ok" } });
        await started.close();

        const exit = vi.spyOn(process, "exit").mockImplementation(() => {});
        const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
        process.env.DATABASE_PATH = path.join(databasePath, "nested.sqlite");

        await runDirect(indexPath);

        expect(exit).toHaveBeenCalledWith(1);
        expect(errorLog).toHaveBeenCalled();
        exit.mockRestore();
        errorLog.mockRestore();
    });

    it("startet als eigener Node-Prozess unabhängig vom Frontend", async () => {
        const databasePath = path.join(temporaryDirectory(), "process.sqlite");
        const child = spawn(process.execPath, [indexPath], {
            cwd: path.resolve("."),
            env: {
                ...process.env,
                HOST: "127.0.0.1",
                PORT: "0",
                DATABASE_PATH: databasePath,
            },
            stdio: ["ignore", "pipe", "pipe"],
        });

        let output = "";
        let errors = "";
        child.stderr.on("data", (chunk) => {
            errors += chunk.toString();
        });
        const exit = new Promise((resolve, reject) => {
            child.on("exit", (code) => resolve(code));
            child.on("error", reject);
        });
        const address = await new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new Error(`Prozess startete nicht. Ausgabe: ${output}\n${errors}`));
            }, 15000);
            child.stdout.on("data", (chunk) => {
                output += chunk.toString();
                const match = /http:\/\/([^:]+):(\d+)\/api\/health/u.exec(output);
                if (match) {
                    clearTimeout(timer);
                    resolve({ host: match[1], port: Number(match[2]) });
                }
            });
            child.on("exit", (code) => {
                clearTimeout(timer);
                reject(new Error(`Prozess endete mit Code ${code}. Ausgabe: ${output}\n${errors}`));
            });
        });

        const response = await getJson(`http://${address.host}:${address.port}/api/health`);
        expect(response).toEqual({ statusCode: 200, body: { status: "ok" } });

        child.kill();
        await exit;
    }, 20000);
});
