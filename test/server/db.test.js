import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadMigrations, openDatabase, resolveDatabasePath } from "../../server/db.js";

const directories = [];

function temporaryDirectory() {
    const directory = mkdtempSync(path.join(tmpdir(), "cpc-db-"));
    directories.push(directory);
    return directory;
}

afterEach(() => {
    while (directories.length > 0) {
        rmSync(directories.pop(), { recursive: true, force: true });
    }
});

describe("resolveDatabasePath", () => {
    it("verwendet data/cpc.sqlite, wenn kein Pfad gesetzt ist", () => {
        const previous = process.env.DATABASE_PATH;
        delete process.env.DATABASE_PATH;
        expect(resolveDatabasePath()).toBe(path.resolve("data/cpc.sqlite"));
        expect(resolveDatabasePath({})).toBe(path.resolve("data/cpc.sqlite"));
        expect(resolveDatabasePath({ DATABASE_PATH: "" })).toBe(path.resolve("data/cpc.sqlite"));
        if (previous === undefined) {
            delete process.env.DATABASE_PATH;
        } else {
            process.env.DATABASE_PATH = previous;
        }
    });

    it("löst einen konfigurierten Pfad auf", () => {
        expect(resolveDatabasePath({ DATABASE_PATH: "custom/band.sqlite" }))
            .toBe(path.resolve("custom/band.sqlite"));
    });
});

describe("openDatabase", () => {
    it("legt die Datei im WAL-Modus an und zeichnet den Schema-Stand auf", () => {
        const databasePath = path.join(temporaryDirectory(), "nested", "cpc.sqlite");
        const database = openDatabase(databasePath);
        const mode = database.prepare("PRAGMA journal_mode").get();
        const foreignKeys = database.prepare("PRAGMA foreign_keys").get();
        const versions = database.prepare("SELECT version FROM schema_migrations").all();

        expect(mode.journal_mode).toBe("wal");
        expect(foreignKeys.foreign_keys).toBe(1);
        expect(versions.map((row) => row.version)).toEqual([1]);
        database.close();
    });

    it("öffnet dieselbe Datei erneut, ohne den Schema-Stand zu wiederholen", () => {
        const databasePath = path.join(temporaryDirectory(), "cpc.sqlite");
        const first = openDatabase(databasePath);
        const appliedAt = first.prepare("SELECT applied_at FROM schema_migrations WHERE version = 1").get();
        first.close();

        const second = openDatabase(databasePath);
        const rows = second.prepare("SELECT version, applied_at FROM schema_migrations").all();
        expect(rows).toEqual([{ version: 1, applied_at: appliedAt.applied_at }]);
        second.close();
    });

    it("übernimmt einen fehlgeschlagenen Schema-Stand nicht", () => {
        const databasePath = path.join(temporaryDirectory(), "cpc.sqlite");
        const baseline = loadMigrations();

        expect(() => openDatabase(databasePath, {
            migrations: [
                ...baseline,
                { version: 2, sql: "NOT SQL" },
            ],
        })).toThrow(/Schema-Stand 2/);

        const database = openDatabase(databasePath);
        const versions = database.prepare("SELECT version FROM schema_migrations").all();
        expect(versions.map((row) => row.version)).toEqual([1]);
        database.close();
    });

    it("wendet Schema-Stände numerisch aufsteigend an", () => {
        const directory = temporaryDirectory();
        const schemaDirectory = path.join(directory, "schema");
        mkdirSync(schemaDirectory);
        writeFileSync(
            path.join(schemaDirectory, "1_init.sql"),
            "CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);",
        );
        writeFileSync(path.join(schemaDirectory, "10_later.sql"), "SELECT 1;");
        writeFileSync(path.join(schemaDirectory, "9_middle.sql"), "SELECT 1;");

        const database = openDatabase(path.join(directory, "cpc.sqlite"), { schemaDirectory });
        const versions = database.prepare(
            "SELECT version FROM schema_migrations ORDER BY version",
        ).all();
        expect(versions.map((row) => row.version)).toEqual([1, 9, 10]);
        database.close();
    });

    it("verlangt einen vorhandenen Schema-Stand", () => {
        const directory = temporaryDirectory();
        const databasePath = path.join(directory, "cpc.sqlite");
        const missing = path.join(directory, "missing-schema");
        const empty = path.join(directory, "empty-schema");
        mkdirSync(empty);
        writeFileSync(path.join(empty, "notes.txt"), "kein sql");

        expect(() => openDatabase(databasePath, { schemaDirectory: missing }))
            .toThrow(/Schema-Verzeichnis fehlt/);
        expect(() => openDatabase(databasePath, { schemaDirectory: empty }))
            .toThrow(/Kein Schema-Stand/);
        expect(() => openDatabase("")).toThrow(/Datenbankpfad fehlt/);
    });
});

describe("loadMigrations", () => {
    it("lehnt doppelte Schema-Versionen ab", () => {
        const schemaDirectory = path.join(temporaryDirectory(), "schema");
        mkdirSync(schemaDirectory);
        writeFileSync(path.join(schemaDirectory, "001_init.sql"), "SELECT 1;");
        writeFileSync(path.join(schemaDirectory, "001_another.sql"), "SELECT 1;");

        expect(() => loadMigrations(schemaDirectory)).toThrow(
            `Schema-Version 1 kommt in ${schemaDirectory} mehrfach vor: 001_another.sql, 001_init.sql.`,
        );
    });
});
