import { createHash, randomBytes } from "node:crypto";
import { AccountError, isSqliteBusy, isSqliteConstraint } from "./errors.js";
import {
    consumeTimingPad,
    hashPassword,
    isValidPassword,
    normalizeUsername,
    tokensMatch,
    verifyPassword,
} from "./passwords.js";

export function hashToken(token) {
    return createHash("sha256").update(token).digest("hex");
}

export function toPublicAccount(row) {
    return {
        id: Number(row.id),
        username: row.username,
        administrator: row.administrator === 1,
        disabled: row.disabled === 1,
        mustChangePassword: row.must_change_password === 1,
    };
}

function waitLocked(ms) {
    if (!ms || ms <= 0) {
        return;
    }
    const end = Date.now() + ms;
    while (Date.now() < end) {
        const remaining = end - Date.now();
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, Math.max(1, Math.min(50, remaining)));
    }
}

function withImmediate(database, fn) {
    database.exec("BEGIN IMMEDIATE");
    try {
        const result = fn();
        database.exec("COMMIT");
        return result;
    } catch (error) {
        try {
            database.exec("ROLLBACK");
        } catch {
            // Die Transaktion ist bereits beendet.
        }
        throw error;
    }
}

function withBusyRetry(fn) {
    for (let attempt = 0; attempt < 5; attempt += 1) {
        try {
            return fn();
        } catch (error) {
            if (!isSqliteBusy(error) || attempt === 4) {
                throw error;
            }
        }
    }
    return undefined;
}

function insertAccount(database, { username, usernameKey, passwordHash, administrator, mustChangePassword }) {
    const result = database.prepare(`
        INSERT INTO accounts (
            username, username_key, password_hash, administrator, disabled, must_change_password, created_at
        ) VALUES (?, ?, ?, ?, 0, ?, ?)
    `).run(
        username,
        usernameKey,
        passwordHash,
        administrator ? 1 : 0,
        mustChangePassword ? 1 : 0,
        new Date().toISOString(),
    );
    return toPublicAccount({
        id: result.lastInsertRowid,
        username,
        administrator: administrator ? 1 : 0,
        disabled: 0,
        must_change_password: mustChangePassword ? 1 : 0,
    });
}

export function isSetupRequired(database) {
    return !database.prepare("SELECT id FROM accounts WHERE administrator = 1 LIMIT 1").get();
}

export function createInitialAdministrator(database, input) {
    if (!tokensMatch(input.setupToken, input.expectedToken)) {
        throw new AccountError("setup_rejected", 403);
    }
    const normalized = normalizeUsername(input.username);
    if (!normalized) {
        throw new AccountError("invalid_username", 400);
    }
    if (!isValidPassword(input.password)) {
        throw new AccountError("invalid_password", 400);
    }
    const passwordHash = hashPassword(input.password);
    try {
        return withBusyRetry(() => withImmediate(database, () => {
            waitLocked(input.pauseMs ?? 0);
            const existing = database.prepare(
                "SELECT id FROM accounts WHERE administrator = 1 LIMIT 1",
            ).get();
            if (existing) {
                throw new AccountError("setup_complete", 409);
            }
            database.prepare("INSERT INTO setup_guard (id) VALUES (1)").run();
            return insertAccount(database, {
                username: normalized.username,
                usernameKey: normalized.usernameKey,
                passwordHash,
                administrator: true,
                mustChangePassword: false,
            });
        }));
    } catch (error) {
        if (error instanceof AccountError) {
            throw error;
        }
        if (isSqliteConstraint(error)) {
            throw new AccountError("setup_complete", 409);
        }
        throw error;
    }
}

export function authenticate(database, username, password) {
    const normalized = normalizeUsername(username);
    if (!normalized || !isValidPassword(password)) {
        return null;
    }
    const row = database.prepare(`
        SELECT id, username, password_hash, administrator, disabled, must_change_password
        FROM accounts
        WHERE username_key = ?
    `).get(normalized.usernameKey);
    if (!row) {
        consumeTimingPad(password);
        return null;
    }
    const matches = verifyPassword(password, row.password_hash);
    if (!matches || row.disabled === 1) {
        return null;
    }
    return toPublicAccount(row);
}

export function createSession(database, accountId) {
    const token = randomBytes(32).toString("base64url");
    database.prepare(
        "INSERT INTO sessions (account_id, token_hash, created_at) VALUES (?, ?, ?)",
    ).run(accountId, hashToken(token), new Date().toISOString());
    return token;
}

export function findSession(database, token) {
    if (typeof token !== "string" || token.length === 0) {
        return null;
    }
    const row = database.prepare(`
        SELECT accounts.id, accounts.username, accounts.administrator, accounts.disabled,
               accounts.must_change_password, sessions.token_hash
        FROM sessions
        JOIN accounts ON accounts.id = sessions.account_id
        WHERE sessions.token_hash = ?
    `).get(hashToken(token));
    if (!row || row.disabled === 1) {
        return null;
    }
    return {
        account: toPublicAccount(row),
        tokenHash: row.token_hash,
    };
}

export function revokeSession(database, tokenHash) {
    database.prepare("DELETE FROM sessions WHERE token_hash = ?").run(tokenHash);
}

export function listAccounts(database) {
    return database.prepare(`
        SELECT id, username, administrator, disabled, must_change_password
        FROM accounts
        ORDER BY id
    `).all().map(toPublicAccount);
}

export function createAccount(database, { username, password, administrator }) {
    const normalized = normalizeUsername(username);
    if (!normalized) {
        throw new AccountError("invalid_username", 400);
    }
    if (!isValidPassword(password)) {
        throw new AccountError("invalid_password", 400);
    }
    if (administrator !== undefined && administrator !== true && administrator !== false) {
        throw new AccountError("bad_request", 400);
    }
    const passwordHash = hashPassword(password);
    try {
        return withImmediate(database, () => {
            const existing = database.prepare(
                "SELECT id FROM accounts WHERE username_key = ?",
            ).get(normalized.usernameKey);
            if (existing) {
                throw new AccountError("username_taken", 409);
            }
            return insertAccount(database, {
                username: normalized.username,
                usernameKey: normalized.usernameKey,
                passwordHash,
                administrator: administrator === true,
                mustChangePassword: false,
            });
        });
    } catch (error) {
        if (error instanceof AccountError) {
            throw error;
        }
        if (isSqliteConstraint(error)) {
            throw new AccountError("username_taken", 409);
        }
        throw error;
    }
}

function readAccount(database, accountId) {
    return database.prepare(`
        SELECT id, username, administrator, disabled, must_change_password
        FROM accounts
        WHERE id = ?
    `).get(accountId);
}

export function setAccountDisabled(database, accountId, disabled) {
    return withImmediate(database, () => {
        const row = readAccount(database, accountId);
        if (!row) {
            throw new AccountError("not_found", 404);
        }
        if (disabled && row.administrator === 1 && row.disabled === 0) {
            const active = database.prepare(`
                SELECT COUNT(*) AS count
                FROM accounts
                WHERE administrator = 1 AND disabled = 0
            `).get();
            if (Number(active.count) <= 1) {
                throw new AccountError("last_administrator", 409);
            }
        }
        database.prepare("UPDATE accounts SET disabled = ? WHERE id = ?").run(disabled ? 1 : 0, accountId);
        if (disabled) {
            database.prepare("DELETE FROM sessions WHERE account_id = ?").run(accountId);
        }
        return toPublicAccount({ ...row, disabled: disabled ? 1 : 0 });
    });
}

export function resetAccountPassword(database, accountId, temporaryPassword) {
    if (!isValidPassword(temporaryPassword)) {
        throw new AccountError("invalid_password", 400);
    }
    const row = readAccount(database, accountId);
    if (!row) {
        throw new AccountError("not_found", 404);
    }
    const passwordHash = hashPassword(temporaryPassword);
    withImmediate(database, () => {
        database.prepare(
            "UPDATE accounts SET password_hash = ?, must_change_password = 1 WHERE id = ?",
        ).run(passwordHash, accountId);
        database.prepare("DELETE FROM sessions WHERE account_id = ?").run(accountId);
    });
    return toPublicAccount({ ...row, must_change_password: 1 });
}

export function changeOwnPassword(database, accountId, currentPassword, newPassword) {
    if (!isValidPassword(newPassword)) {
        throw new AccountError("invalid_password", 400);
    }
    const row = database.prepare("SELECT password_hash FROM accounts WHERE id = ?").get(accountId);
    if (!row || !isValidPassword(currentPassword) || !verifyPassword(currentPassword, row.password_hash)) {
        throw new AccountError("password_rejected", 401);
    }
    const passwordHash = hashPassword(newPassword);
    withImmediate(database, () => {
        database.prepare(
            "UPDATE accounts SET password_hash = ?, must_change_password = 0 WHERE id = ?",
        ).run(passwordHash, accountId);
        database.prepare("DELETE FROM sessions WHERE account_id = ?").run(accountId);
    });
}
