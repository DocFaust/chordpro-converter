import { AccountError } from "./errors.js";
import {
    authenticate,
    changeOwnPassword,
    createAccount,
    createInitialAdministrator,
    createSession,
    findSession,
    isSetupRequired,
    listAccounts,
    resetAccountPassword,
    revokeSession,
    setAccountDisabled,
} from "./accounts.js";
import { clearSessionCookieHeader, readSessionToken, sessionCookieHeader } from "./cookies.js";
import { resolveCookieSecure } from "./http-guard.js";
import {
    LOGIN_ACCOUNT_LIMIT,
    LOGIN_IP_LIMIT,
    RATE_WINDOW_MS,
    SETUP_IP_LIMIT,
    createRateLimiter,
} from "./rate-limit.js";

function sendAccountError(reply, error) {
    if (!(error instanceof AccountError)) {
        return false;
    }
    reply.code(error.status).send({ error: error.code });
    return true;
}

function requireAccount(request, reply, { full = false, administrator = false } = {}) {
    if (!request.auth) {
        reply.code(401).send({ error: "unauthenticated" });
        return null;
    }
    if (full && request.auth.account.mustChangePassword) {
        reply.code(403).send({ error: "password_change_required" });
        return null;
    }
    if (administrator && !request.auth.account.administrator) {
        reply.code(403).send({ error: "forbidden" });
        return null;
    }
    return request.auth;
}

function accountId(request) {
    if (!/^[1-9]\d*$/u.test(String(request.params.id ?? ""))) {
        return null;
    }
    return Number(request.params.id);
}

export function registerAccountRoutes(app, database, options = {}) {
    const accountLimiter = createRateLimiter({
        limit: options.loginAccountLimit ?? LOGIN_ACCOUNT_LIMIT,
        windowMs: options.rateWindowMs ?? RATE_WINDOW_MS,
    });
    const ipLimiter = createRateLimiter({
        limit: options.loginIpLimit ?? LOGIN_IP_LIMIT,
        windowMs: options.rateWindowMs ?? RATE_WINDOW_MS,
    });
    const setupLimiter = createRateLimiter({
        limit: options.setupIpLimit ?? SETUP_IP_LIMIT,
        windowMs: options.rateWindowMs ?? RATE_WINDOW_MS,
    });

    const secureCookie = (request) => resolveCookieSecure(request, options.cookieSecure);
    const setSession = (reply, request, token) => {
        reply.header("Set-Cookie", sessionCookieHeader(token, { secure: secureCookie(request) }));
    };
    const clearSession = (reply, request) => {
        reply.header("Set-Cookie", clearSessionCookieHeader({ secure: secureCookie(request) }));
    };

    app.addHook("preHandler", async (request) => {
        request.auth = findSession(database, readSessionToken(request.headers.cookie));
    });

    app.get("/api/setup", async () => {
        return { setupRequired: isSetupRequired(database) };
    });

    app.post("/api/setup", async (request, reply) => {
        const ipKey = `setup:${request.ip}`;
        if (!setupLimiter.check(ipKey)) {
            return reply.code(429).send({ error: "too_many_attempts" });
        }
        try {
            const account = createInitialAdministrator(database, {
                username: request.body?.username,
                password: request.body?.password,
                setupToken: request.body?.setupToken,
                expectedToken: options.setupToken,
            });
            setSession(reply, request, createSession(database, account.id));
            return reply.code(201).send(account);
        } catch (error) {
            if (error instanceof AccountError && error.status !== 409) {
                setupLimiter.hit(ipKey);
            }
            if (sendAccountError(reply, error)) {
                return;
            }
            throw error;
        }
    });

    app.post("/api/login", async (request, reply) => {
        const username = typeof request.body?.username === "string" ? request.body.username : "";
        const accountKey = `account:${username.trim().toLowerCase()}`;
        const ipKey = `ip:${request.ip}`;
        if (!accountLimiter.check(accountKey) || !ipLimiter.check(ipKey)) {
            return reply.code(429).send({ error: "too_many_attempts" });
        }
        const account = authenticate(database, request.body?.username, request.body?.password);
        if (!account) {
            accountLimiter.hit(accountKey);
            ipLimiter.hit(ipKey);
            return reply.code(401).send({ error: "login_failed" });
        }
        accountLimiter.reset(accountKey);
        setSession(reply, request, createSession(database, account.id));
        return account;
    });

    app.post("/api/logout", async (request, reply) => {
        if (request.auth) {
            revokeSession(database, request.auth.tokenHash);
        }
        clearSession(reply, request);
        return reply.code(204).send();
    });

    app.get("/api/me", async (request, reply) => {
        const auth = requireAccount(request, reply);
        if (!auth) {
            return;
        }
        return auth.account;
    });

    app.post("/api/password", async (request, reply) => {
        const auth = requireAccount(request, reply);
        if (!auth) {
            return;
        }
        try {
            changeOwnPassword(
                database,
                auth.account.id,
                request.body?.currentPassword,
                request.body?.newPassword,
            );
        } catch (error) {
            if (sendAccountError(reply, error)) {
                return;
            }
            throw error;
        }
        clearSession(reply, request);
        return reply.code(204).send();
    });

    app.get("/api/accounts", async (request, reply) => {
        const auth = requireAccount(request, reply, { full: true, administrator: true });
        if (!auth) {
            return;
        }
        return { accounts: listAccounts(database) };
    });

    app.post("/api/accounts", async (request, reply) => {
        const auth = requireAccount(request, reply, { full: true, administrator: true });
        if (!auth) {
            return;
        }
        try {
            const account = createAccount(database, {
                username: request.body?.username,
                password: request.body?.password,
                administrator: request.body?.administrator,
            });
            return reply.code(201).send(account);
        } catch (error) {
            if (sendAccountError(reply, error)) {
                return;
            }
            throw error;
        }
    });

    app.post("/api/accounts/:id/deactivate", async (request, reply) => {
        const auth = requireAccount(request, reply, { full: true, administrator: true });
        if (!auth) {
            return;
        }
        const id = accountId(request);
        if (!id) {
            return reply.code(404).send({ error: "not_found" });
        }
        try {
            return setAccountDisabled(database, id, true);
        } catch (error) {
            if (sendAccountError(reply, error)) {
                return;
            }
            throw error;
        }
    });

    app.post("/api/accounts/:id/activate", async (request, reply) => {
        const auth = requireAccount(request, reply, { full: true, administrator: true });
        if (!auth) {
            return;
        }
        const id = accountId(request);
        if (!id) {
            return reply.code(404).send({ error: "not_found" });
        }
        try {
            return setAccountDisabled(database, id, false);
        } catch (error) {
            if (sendAccountError(reply, error)) {
                return;
            }
            throw error;
        }
    });

    app.post("/api/accounts/:id/password", async (request, reply) => {
        const auth = requireAccount(request, reply, { full: true, administrator: true });
        if (!auth) {
            return;
        }
        const id = accountId(request);
        if (!id) {
            return reply.code(404).send({ error: "not_found" });
        }
        try {
            return resetAccountPassword(database, id, request.body?.password);
        } catch (error) {
            if (sendAccountError(reply, error)) {
                return;
            }
            throw error;
        }
    });
}
