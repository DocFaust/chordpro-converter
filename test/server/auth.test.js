import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { hashToken } from "../../server/accounts.js";
import { buildApp, start } from "../../server/app.js";
import { openDatabase } from "../../server/db.js";

const directories = [];
const TOKEN = "test-setup-token";
const HOST = "127.0.0.1:3000";
const ORIGIN = `http://${HOST}`;
const PASSWORD = "plain-secret-qf7";

function temporaryDirectory() {
    const directory = mkdtempSync(path.join(tmpdir(), "cpc-auth-"));
    directories.push(directory);
    return directory;
}

function openTestDatabase() {
    return openDatabase(path.join(temporaryDirectory(), "cpc.sqlite"));
}

function write(app, url, payload, { cookie, headers = {} } = {}) {
    return app.inject({
        method: "POST",
        url,
        headers: {
            host: HOST,
            origin: ORIGIN,
            "content-type": "application/json",
            "x-cpc-request": "1",
            ...(cookie ? { cookie: `cpc_session=${cookie}` } : {}),
            ...headers,
        },
        payload,
    });
}

function read(app, url, cookie) {
    return app.inject({
        method: "GET",
        url,
        headers: {
            host: HOST,
            ...(cookie ? { cookie: `cpc_session=${cookie}` } : {}),
        },
    });
}

function setCookie(response) {
    const raw = response.headers["set-cookie"];
    return Array.isArray(raw) ? raw[0] : raw;
}

function sessionToken(response) {
    const match = /^cpc_session=([^;]*)/u.exec(setCookie(response) ?? "");
    return match?.[1] ?? "";
}

async function setupAdmin(app, username = "Ada") {
    const response = await write(app, "/api/setup", {
        username,
        password: PASSWORD,
        setupToken: TOKEN,
    });
    expect(response.statusCode).toBe(201);
    return { response, token: sessionToken(response), account: response.json() };
}

afterEach(() => {
    vi.restoreAllMocks();
    while (directories.length > 0) {
        rmSync(directories.pop(), { recursive: true, force: true });
    }
});

describe("Ersteinrichtung", () => {
    it("legt ohne gültiges Token kein Konto an und richtet danach genau eines ein", async () => {
        const database = openTestDatabase();
        const app = buildApp(database, { setupToken: TOKEN });
        const logs = ["log", "error", "warn"].map((method) => vi.spyOn(console, method).mockImplementation(() => {}));

        const missing = await write(app, "/api/setup", {
            username: "Ada",
            password: PASSWORD,
        });
        const wrong = await write(app, "/api/setup", {
            username: "Ada",
            password: PASSWORD,
            setupToken: "anderes-token",
        });
        expect(missing.statusCode).toBe(403);
        expect(missing.json()).toEqual({ error: "setup_rejected" });
        expect(wrong.statusCode).toBe(403);
        expect(database.prepare("SELECT COUNT(*) AS count FROM accounts").get().count).toBe(0);

        const first = await setupAdmin(app, "Joshi");
        expect(first.account).toEqual({
            id: 1,
            username: "Joshi",
            administrator: true,
            disabled: false,
            mustChangePassword: false,
        });
        expect(setCookie(first.response)).toContain("HttpOnly");
        expect(setCookie(first.response)).toContain("SameSite=Strict");
        expect(setCookie(first.response)).toContain("Max-Age=34560000");
        expect(setCookie(first.response).includes("Secure")).toBe(false);
        expect(first.response.headers["access-control-allow-origin"]).toBeUndefined();

        const stored = database.prepare("SELECT username, password_hash FROM accounts").get();
        expect(stored.username).toBe("Joshi");
        expect(stored.password_hash).not.toContain(PASSWORD);
        expect(stored.password_hash.startsWith("scrypt:")).toBe(true);
        const session = database.prepare("SELECT token_hash FROM sessions").get();
        expect(session.token_hash).toBe(hashToken(first.token));
        expect(session.token_hash).not.toBe(first.token);
        expect(JSON.stringify(first.response.json())).not.toContain(PASSWORD);
        expect(JSON.stringify(first.response.json())).not.toContain(first.token);

        const again = await write(app, "/api/setup", {
            username: "Zweite",
            password: PASSWORD,
            setupToken: TOKEN,
        });
        expect(again.statusCode).toBe(409);
        expect(again.json()).toEqual({ error: "setup_complete" });
        expect(database.prepare("SELECT COUNT(*) AS count FROM accounts").get().count).toBe(1);
        expect((await read(app, "/api/setup")).json()).toEqual({ setupRequired: false });

        const output = logs.flatMap((spy) => spy.mock.calls.flat()).join("\n");
        expect(output).not.toContain(PASSWORD);
        expect(output).not.toContain(TOKEN);

        await app.close();
        database.close();
    });

    it("lehnt die Einrichtung ab, wenn kein Token konfiguriert ist", async () => {
        const database = openTestDatabase();
        const previous = process.env.SETUP_TOKEN;
        delete process.env.SETUP_TOKEN;
        const app = buildApp(database, {});
        const response = await write(app, "/api/setup", {
            username: "Ada",
            password: PASSWORD,
            setupToken: TOKEN,
        });
        expect(response.statusCode).toBe(403);
        expect(database.prepare("SELECT COUNT(*) AS count FROM accounts").get().count).toBe(0);
        if (previous === undefined) {
            delete process.env.SETUP_TOKEN;
        } else {
            process.env.SETUP_TOKEN = previous;
        }
        await app.close();
        database.close();
    });

    it("übernimmt das Token aus der Umgebung beim Prozessstart", async () => {
        const databasePath = path.join(temporaryDirectory(), "cpc.sqlite");
        const previous = process.env.SETUP_TOKEN;
        process.env.SETUP_TOKEN = TOKEN;
        let started;
        try {
            started = await start({ host: "127.0.0.1", port: 0, databasePath });
            const response = await write(started.app, "/api/setup", {
                username: "Ada",
                password: PASSWORD,
                setupToken: TOKEN,
            });
            expect(response.statusCode).toBe(201);
        } finally {
            if (previous === undefined) {
                delete process.env.SETUP_TOKEN;
            } else {
                process.env.SETUP_TOKEN = previous;
            }
            await started?.close();
        }
    });

    it("begrenzt wiederholte Einrichtungsversuche", async () => {
        const database = openTestDatabase();
        const app = buildApp(database, { setupToken: TOKEN, setupIpLimit: 2 });
        for (let attempt = 0; attempt < 2; attempt += 1) {
            const response = await write(app, "/api/setup", {
                username: "Ada",
                password: PASSWORD,
                setupToken: "falsch",
            });
            expect(response.statusCode).toBe(403);
        }
        const blocked = await write(app, "/api/setup", {
            username: "Ada",
            password: PASSWORD,
            setupToken: TOKEN,
        });
        expect(blocked.statusCode).toBe(429);
        expect(database.prepare("SELECT COUNT(*) AS count FROM accounts").get().count).toBe(0);
        await app.close();
        database.close();
    });
});

describe("Anmeldung und Sitzungen", () => {
    it("meldet an, ab und weist widerrufene Sitzungen ab", async () => {
        const database = openTestDatabase();
        const app = buildApp(database, { setupToken: TOKEN });
        await setupAdmin(app, "Joshi");
        const columns = database.prepare("PRAGMA table_info(sessions)").all().map((column) => column.name);
        expect(columns).toEqual(["id", "account_id", "token_hash", "created_at"]);

        const wrong = await write(app, "/api/login", { username: "Joshi", password: "falsch" });
        const empty = await write(app, "/api/login", { username: "Joshi", password: "" });
        const unknown = await write(app, "/api/login", { username: "Niemand", password: PASSWORD });
        expect(wrong.statusCode).toBe(401);
        expect(empty.statusCode).toBe(401);
        expect(unknown.statusCode).toBe(401);
        expect(wrong.json()).toEqual({ error: "login_failed" });

        const planted = "vorhandenes-token";
        const login = await write(app, "/api/login", {
            username: "JOSHI",
            password: PASSWORD,
        }, { cookie: planted });
        expect(login.statusCode).toBe(200);
        expect(login.json().username).toBe("Joshi");
        const token = sessionToken(login);
        expect(token).not.toBe(planted);
        expect(setCookie(login)).toContain("HttpOnly");
        expect(setCookie(login)).toContain("SameSite=Strict");

        const me = await read(app, "/api/me", token);
        expect(me.statusCode).toBe(200);
        expect(me.json().username).toBe("Joshi");
        expect(JSON.stringify(me.json())).not.toContain(PASSWORD);

        const oldSession = await read(app, "/api/me", planted);
        expect(oldSession.statusCode).toBe(401);

        const logout = await write(app, "/api/logout", {}, { cookie: token });
        expect(logout.statusCode).toBe(204);
        expect(setCookie(logout)).toContain("Max-Age=0");
        expect((await read(app, "/api/me", token)).statusCode).toBe(401);
        const idempotent = await write(app, "/api/logout", {});
        expect(idempotent.statusCode).toBe(204);

        await app.close();
        database.close();
    });

    it("setzt Secure nur bei HTTPS oder COOKIE_SECURE und ignoriert Proxy-Header", async () => {
        const database = openTestDatabase();
        const secureApp = buildApp(database, { setupToken: TOKEN, cookieSecure: "true" });
        const secure = await write(secureApp, "/api/setup", {
            username: "Ada",
            password: PASSWORD,
            setupToken: TOKEN,
        }, {
            headers: {
                host: HOST,
                origin: `https://${HOST}`,
                "x-forwarded-proto": "http",
            },
        });
        expect(secure.statusCode).toBe(201);
        expect(setCookie(secure)).toContain("Secure");

        const plainApp = buildApp(database, { setupToken: TOKEN });
        const mismatch = await write(plainApp, "/api/login", {
            username: "Ada",
            password: PASSWORD,
        }, {
            headers: {
                host: HOST,
                origin: `https://${HOST}`,
                "x-forwarded-proto": "https",
            },
        });
        expect(mismatch.statusCode).toBe(403);
        expect(mismatch.json()).toEqual({ error: "origin_mismatch" });

        const missing = await plainApp.inject({
            method: "POST",
            url: "/api/login",
            headers: {
                host: HOST,
                "content-type": "application/json",
                "x-cpc-request": "1",
                "x-forwarded-proto": "https",
            },
            payload: { username: "Ada", password: PASSWORD },
        });
        expect(missing.statusCode).toBe(403);
        expect(missing.json()).toEqual({ error: "origin_missing" });

        const login = await write(plainApp, "/api/login", {
            username: "Ada",
            password: PASSWORD,
        }, { headers: { "x-forwarded-proto": "https", "x-forwarded-for": "203.0.113.5" } });
        expect(login.statusCode).toBe(200);
        expect(setCookie(login).includes("Secure")).toBe(false);

        await secureApp.close();
        await plainApp.close();
        database.close();
    });

    it("blockiert wiederholte Fehlversuche je Konto", async () => {
        const database = openTestDatabase();
        const app = buildApp(database, { setupToken: TOKEN, loginAccountLimit: 2 });
        await setupAdmin(app);
        for (let attempt = 0; attempt < 2; attempt += 1) {
            expect((await write(app, "/api/login", { username: "Ada", password: "falsch" })).statusCode).toBe(401);
        }
        const blocked = await write(app, "/api/login", { username: "ada", password: PASSWORD });
        expect(blocked.statusCode).toBe(429);
        await app.close();
        database.close();
    });

    it("blockiert Fehlversuche je Adresse über verschiedene Namen", async () => {
        const database = openTestDatabase();
        const app = buildApp(database, { setupToken: TOKEN, loginIpLimit: 2 });
        await setupAdmin(app);
        expect((await write(app, "/api/login", { username: "Eins", password: PASSWORD })).statusCode).toBe(401);
        expect((await write(app, "/api/login", { username: "Zwei", password: PASSWORD })).statusCode).toBe(401);
        const blocked = await write(app, "/api/login", { username: "Drei", password: PASSWORD });
        expect(blocked.statusCode).toBe(429);
        await app.close();
        database.close();
    });
});

describe("Kontenverwaltung", () => {
    async function adminApp() {
        const database = openTestDatabase();
        const app = buildApp(database, { setupToken: TOKEN });
        const admin = await setupAdmin(app);
        return { database, app, admin };
    }

    it("erlaubt nur Administratoren das Anlegen und kennt keine Registrierung", async () => {
        const { database, app, admin } = await adminApp();
        const register = await write(app, "/api/register", {
            username: "Fremd",
            password: PASSWORD,
        });
        expect(register.statusCode).toBe(404);
        expect(database.prepare("SELECT COUNT(*) AS count FROM accounts").get().count).toBe(1);

        const unauthenticated = await write(app, "/api/accounts", {
            username: "Ben",
            password: PASSWORD,
        });
        expect(unauthenticated.statusCode).toBe(401);

        const created = await write(app, "/api/accounts", {
            username: "Ben",
            password: "member-secret-qf7",
            administrator: false,
        }, { cookie: admin.token });
        expect(created.statusCode).toBe(201);
        expect(created.json().username).toBe("Ben");
        expect(created.json().administrator).toBe(false);

        const memberLogin = await write(app, "/api/login", {
            username: "ben",
            password: "member-secret-qf7",
        });
        const duplicate = await write(app, "/api/accounts", {
            username: "BEN",
            password: "member-secret-qf7",
        }, { cookie: admin.token });
        expect(duplicate.statusCode).toBe(409);
        expect(duplicate.json()).toEqual({ error: "username_taken" });

        const forbidden = await write(app, "/api/accounts", {
            username: "Cora",
            password: "member-secret-qf7",
        }, { cookie: sessionToken(memberLogin) });
        expect(forbidden.statusCode).toBe(403);
        expect(forbidden.json()).toEqual({ error: "forbidden" });

        const invalid = await write(app, "/api/accounts", {
            username: " ",
            password: "",
        }, { cookie: admin.token });
        expect(invalid.statusCode).toBe(400);

        const listed = await read(app, "/api/accounts", admin.token);
        expect(listed.json().accounts.map((account) => account.username)).toEqual(["Ada", "Ben"]);
        expect(JSON.stringify(listed.json())).not.toContain("password_hash");
        expect((await read(app, "/api/accounts", sessionToken(memberLogin))).statusCode).toBe(403);

        await app.close();
        database.close();
    });

    it("deaktiviert und aktiviert, ohne die alte Sitzung oder das Passwort zurückzusetzen", async () => {
        const { database, app, admin } = await adminApp();
        const created = await write(app, "/api/accounts", {
            username: "Ben",
            password: "member-secret-qf7",
        }, { cookie: admin.token });
        const member = await write(app, "/api/login", { username: "Ben", password: "member-secret-qf7" });
        const memberToken = sessionToken(member);
        const hashBefore = database.prepare(
            "SELECT password_hash FROM accounts WHERE username = 'Ben'",
        ).get().password_hash;

        const deactivated = await write(app, `/api/accounts/${created.json().id}/deactivate`, {}, {
            cookie: admin.token,
        });
        expect(deactivated.statusCode).toBe(200);
        expect(deactivated.json().disabled).toBe(true);
        expect(database.prepare("SELECT COUNT(*) AS count FROM accounts").get().count).toBe(2);
        expect((await read(app, "/api/me", memberToken)).statusCode).toBe(401);
        const blocked = await write(app, "/api/login", { username: "Ben", password: "member-secret-qf7" });
        expect(blocked.statusCode).toBe(401);

        const activated = await write(app, `/api/accounts/${created.json().id}/activate`, {}, {
            cookie: admin.token,
        });
        expect(activated.json().disabled).toBe(false);
        expect(database.prepare("SELECT password_hash FROM accounts WHERE username = 'Ben'").get().password_hash)
            .toBe(hashBefore);
        expect((await read(app, "/api/me", memberToken)).statusCode).toBe(401);
        const again = await write(app, "/api/login", { username: "Ben", password: "member-secret-qf7" });
        expect(again.statusCode).toBe(200);
        expect(again.json().mustChangePassword).toBe(false);

        const missing = await write(app, "/api/accounts/999/deactivate", {}, { cookie: admin.token });
        expect(missing.statusCode).toBe(404);
        const malformed = await write(app, "/api/accounts/0/activate", {}, { cookie: admin.token });
        expect(malformed.statusCode).toBe(404);

        await app.close();
        database.close();
    });

    function accountSnapshot(database, accountId) {
        return {
            account: database.prepare(`
                SELECT username, administrator, disabled, password_hash, must_change_password
                FROM accounts
                WHERE id = ?
            `).get(accountId),
            sessions: database.prepare(`
                SELECT token_hash FROM sessions WHERE account_id = ? ORDER BY token_hash
            `).all(accountId),
        };
    }

    it("lehnt das Deaktivieren des letzten aktiven Administrators ab", async () => {
        const { database, app, admin } = await adminApp();
        const before = accountSnapshot(database, admin.account.id);

        const rejected = await write(app, `/api/accounts/${admin.account.id}/deactivate`, {}, {
            cookie: admin.token,
        });
        expect(rejected.statusCode).toBe(409);
        expect(rejected.json()).toEqual({ error: "last_administrator" });
        expect(accountSnapshot(database, admin.account.id)).toEqual(before);
        expect((await read(app, "/api/me", admin.token)).statusCode).toBe(200);

        await app.close();
        database.close();
    });

    it("deaktiviert einen von mehreren aktiven Administratoren", async () => {
        const { database, app, admin } = await adminApp();
        const second = await write(app, "/api/accounts", {
            username: "Bea",
            password: "admin-secret-qf7",
            administrator: true,
        }, { cookie: admin.token });
        const secondLogin = await write(app, "/api/login", {
            username: "Bea",
            password: "admin-secret-qf7",
        });

        const deactivated = await write(app, `/api/accounts/${second.json().id}/deactivate`, {}, {
            cookie: admin.token,
        });
        expect(deactivated.statusCode).toBe(200);
        expect(deactivated.json()).toMatchObject({ username: "Bea", disabled: true, administrator: true });
        expect((await read(app, "/api/me", sessionToken(secondLogin))).statusCode).toBe(401);
        expect((await read(app, "/api/me", admin.token)).statusCode).toBe(200);
        expect(database.prepare("SELECT disabled FROM accounts WHERE id = ?").get(admin.account.id).disabled).toBe(0);

        await app.close();
        database.close();
    });

    it("lehnt das Deaktivieren des letzten verbleibenden Administrators ab", async () => {
        const { database, app, admin } = await adminApp();
        const second = await write(app, "/api/accounts", {
            username: "Bea",
            password: "admin-secret-qf7",
            administrator: true,
        }, { cookie: admin.token });
        const removed = await write(app, `/api/accounts/${second.json().id}/deactivate`, {}, {
            cookie: admin.token,
        });
        expect(removed.statusCode).toBe(200);

        const before = accountSnapshot(database, admin.account.id);
        const rejected = await write(app, `/api/accounts/${admin.account.id}/deactivate`, {}, {
            cookie: admin.token,
        });
        expect(rejected.statusCode).toBe(409);
        expect(rejected.json()).toEqual({ error: "last_administrator" });
        expect(accountSnapshot(database, admin.account.id)).toEqual(before);
        expect((await read(app, "/api/me", admin.token)).statusCode).toBe(200);

        await app.close();
        database.close();
    });

    it("setzt ein temporäres Passwort ohne Deaktivierung und erzwingt die Änderung", async () => {
        const { database, app, admin } = await adminApp();
        const created = await write(app, "/api/accounts", {
            username: "Ben",
            password: "member-secret-qf7",
        }, { cookie: admin.token });
        const first = await write(app, "/api/login", { username: "Ben", password: "member-secret-qf7" });
        const second = await write(app, "/api/login", { username: "Ben", password: "member-secret-qf7" });
        const id = created.json().id;

        const reset = await write(app, `/api/accounts/${id}/password`, {
            password: "temp-secret-qf7",
        }, { cookie: admin.token });
        expect(reset.statusCode).toBe(200);
        expect(reset.json()).toMatchObject({
            username: "Ben",
            disabled: false,
            mustChangePassword: true,
        });
        expect(JSON.stringify(reset.json())).not.toContain("temp-secret-qf7");
        expect((await read(app, "/api/me", sessionToken(first))).statusCode).toBe(401);
        expect((await read(app, "/api/me", sessionToken(second))).statusCode).toBe(401);
        expect((await write(app, "/api/login", {
            username: "Ben",
            password: "member-secret-qf7",
        })).statusCode).toBe(401);

        const limited = await write(app, "/api/login", { username: "Ben", password: "temp-secret-qf7" });
        const limitedToken = sessionToken(limited);
        expect(limited.json().mustChangePassword).toBe(true);
        expect(limited.json().disabled).toBe(false);
        expect((await read(app, "/api/accounts", limitedToken)).statusCode).toBe(403);
        expect((await read(app, "/api/accounts", limitedToken)).json()).toEqual({
            error: "password_change_required",
        });
        expect((await write(app, "/api/accounts", {
            username: "Cora",
            password: "member-secret-qf7",
        }, { cookie: limitedToken })).statusCode).toBe(403);
        expect((await read(app, "/api/me", limitedToken)).statusCode).toBe(200);

        const rejected = await write(app, "/api/password", {
            currentPassword: "falsch",
            newPassword: "new-secret-qf7",
        }, { cookie: limitedToken });
        expect(rejected.statusCode).toBe(401);
        const changed = await write(app, "/api/password", {
            currentPassword: "temp-secret-qf7",
            newPassword: "new-secret-qf7",
        }, { cookie: limitedToken });
        expect(changed.statusCode).toBe(204);
        expect(setCookie(changed)).toContain("Max-Age=0");
        expect((await read(app, "/api/me", limitedToken)).statusCode).toBe(401);
        expect(database.prepare("SELECT must_change_password, disabled FROM accounts WHERE id = ?").get(id))
            .toEqual({ must_change_password: 0, disabled: 0 });

        const fresh = await write(app, "/api/login", { username: "Ben", password: "new-secret-qf7" });
        expect(fresh.statusCode).toBe(200);
        expect(fresh.json().mustChangePassword).toBe(false);
        expect((await read(app, "/api/accounts", sessionToken(fresh))).statusCode).toBe(403);

        await app.close();
        database.close();
    });

    it("widerruft beim eigenen Passwortwechsel alle Sitzungen des Kontos", async () => {
        const { database, app, admin } = await adminApp();
        const other = await write(app, "/api/login", { username: "Ada", password: PASSWORD });
        const changed = await write(app, "/api/password", {
            currentPassword: PASSWORD,
            newPassword: "new-secret-qf7",
        }, { cookie: admin.token });
        expect(changed.statusCode).toBe(204);
        expect((await read(app, "/api/me", admin.token)).statusCode).toBe(401);
        expect((await read(app, "/api/me", sessionToken(other))).statusCode).toBe(401);
        const empty = await write(app, "/api/password", {
            currentPassword: "new-secret-qf7",
            newPassword: "",
        }, { cookie: sessionToken(await write(app, "/api/login", { username: "Ada", password: "new-secret-qf7" })) });
        expect(empty.statusCode).toBe(400);
        expect(database.prepare("SELECT COUNT(*) AS count FROM sessions").get().count).toBe(1);
        await app.close();
        database.close();
    });
});

describe("ungültige Schreibanfragen", () => {
    it("verlangt JSON und liefert bei defektem JSON keinen internen Fehlertext", async () => {
        const database = openTestDatabase();
        const app = buildApp(database, { setupToken: TOKEN });
        const plain = await app.inject({
            method: "POST",
            url: "/api/login",
            headers: {
                host: HOST,
                origin: ORIGIN,
                "content-type": "text/plain",
                "x-cpc-request": "1",
            },
            payload: "name=ada",
        });
        expect(plain.statusCode).toBe(415);
        const broken = await app.inject({
            method: "POST",
            url: "/api/login",
            headers: {
                host: HOST,
                origin: ORIGIN,
                "content-type": "application/json",
                "x-cpc-request": "1",
            },
            payload: "{",
        });
        expect(broken.statusCode).toBe(400);
        expect(broken.json()).toEqual({ error: "bad_request" });
        expect(broken.body).not.toContain("Syntax");
        await app.close();
        database.close();
    });
});
