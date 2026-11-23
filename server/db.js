import { DatabaseSync } from "node:sqlite";
import { existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MIGRATION_FILE = /^(\d+)_.*\.sql$/u;

function defaultSchemaDirectory() {
    return path.join(path.dirname(fileURLToPath(import.meta.url)), "schema");
}

export function resolveDatabasePath(env = process.env) {
    const configured = env.DATABASE_PATH;
    if (configured) {
        return path.resolve(configured);
    }
    return path.resolve("data/cpc.sqlite");
}

export function loadMigrations(directory = defaultSchemaDirectory()) {
    if (!existsSync(directory)) {
        throw new Error(`Schema-Verzeichnis fehlt: ${directory}`);
    }

    const namesByVersion = new Map();
    const migrations = readdirSync(directory)
        .map((name) => {
            const match = MIGRATION_FILE.exec(name);
            if (!match) {
                return null;
            }
            const version = Number(match[1]);
            const names = namesByVersion.get(version) ?? [];
            names.push(name);
            namesByVersion.set(version, names);
            return {
                version,
                sql: readFileSync(path.join(directory, name), "utf8"),
            };
        })
        .filter((migration) => migration !== null)
        .sort((left, right) => left.version - right.version);

    if (migrations.length === 0) {
        throw new Error(`Kein Schema-Stand in ${directory}.`);
    }

    for (const [version, names] of namesByVersion) {
        if (names.length > 1) {
            names.sort();
            throw new Error(
                `Schema-Version ${version} kommt in ${directory} mehrfach vor: ${names.join(", ")}.`,
            );
        }
    }

    return migrations;
}

function appliedVersions(database) {
    const table = database.prepare(`
        SELECT 1 AS present
        FROM sqlite_master
        WHERE type = 'table' AND name = 'schema_migrations'
    `).get();
    if (!table) {
        return new Set();
    }
    return new Set(
        database.prepare("SELECT version FROM schema_migrations").all().map((row) => row.version),
    );
}

function applyMigration(database, migration) {
    database.exec("BEGIN");
    try {
        database.exec(migration.sql);
        database.prepare(
            "INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)",
        ).run(migration.version, new Date().toISOString());
        database.exec("COMMIT");
    } catch (error) {
        database.exec("ROLLBACK");
        throw new Error(
            `Schema-Stand ${migration.version} konnte nicht angewendet werden.`,
            { cause: error },
        );
    }
}

export function applyMigrations(database, migrations) {
    const applied = appliedVersions(database);
    for (const migration of migrations) {
        if (applied.has(migration.version)) {
            continue;
        }
        applyMigration(database, migration);
        applied.add(migration.version);
    }
}

export function openDatabase(databasePath, options = {}) {
    if (!databasePath) {
        throw new Error("Datenbankpfad fehlt.");
    }

    const resolvedPath = path.resolve(databasePath);
    mkdirSync(path.dirname(resolvedPath), { recursive: true });
    const database = new DatabaseSync(resolvedPath);
    try {
        database.exec("PRAGMA busy_timeout = 5000");
        database.exec("PRAGMA journal_mode = WAL");
        database.exec("PRAGMA foreign_keys = ON");
        const migrations = options.migrations ?? loadMigrations(options.schemaDirectory);
        applyMigrations(database, migrations);
        return database;
    } catch (error) {
        database.close();
        throw error;
    }
}
