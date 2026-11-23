import Fastify from "fastify";
import { registerAccountRoutes } from "./auth-routes.js";
import { openDatabase, resolveDatabasePath } from "./db.js";
import { registerWriteGuard } from "./http-guard.js";

export function resolveListenOptions(options = {}, env = process.env) {
    const host = options.host || env.HOST || "127.0.0.1";
    let port = 3000;
    if (options.port !== undefined) {
        port = Number(options.port);
    } else if (env.PORT !== undefined && env.PORT !== "") {
        port = Number(env.PORT);
    }
    return { host, port };
}

export function buildApp(database, options = {}) {
    const { logger = false, ...settings } = options;
    // trustProxy bleibt aus. TLS am Reverse Proxy wird über COOKIE_SECURE
    // signalisiert, nicht über weitergeleitete Proxy-Header.
    const app = Fastify({ logger, trustProxy: false });

    app.setErrorHandler((error, request, reply) => {
        const status = Number.isInteger(error.statusCode) ? error.statusCode : 500;
        if (status >= 500) {
            request.log.error({ err: error }, "Anfrage fehlgeschlagen");
        }
        const code = status >= 500 ? "internal_error" : "bad_request";
        return reply.code(status).send({ error: code });
    });

    registerWriteGuard(app, settings);

    app.get("/api/health", async (_request, reply) => {
        try {
            database.prepare("SELECT 1 AS ok").get();
        } catch {
            return reply.code(503).send({ status: "unavailable" });
        }
        return { status: "ok" };
    });

    registerAccountRoutes(app, database, settings);
    return app;
}

export async function start(options = {}) {
    const databasePath = options.databasePath ?? resolveDatabasePath();
    const database = openDatabase(databasePath);
    const app = buildApp(database, {
        logger: options.logger ?? false,
        setupToken: options.setupToken !== undefined ? options.setupToken : process.env.SETUP_TOKEN,
        cookieSecure: options.cookieSecure !== undefined ? options.cookieSecure : process.env.COOKIE_SECURE,
        loginAccountLimit: options.loginAccountLimit,
        loginIpLimit: options.loginIpLimit,
        setupIpLimit: options.setupIpLimit,
        rateWindowMs: options.rateWindowMs,
    });
    app.addHook("onClose", async () => {
        database.close();
    });

    const listenOptions = resolveListenOptions(options);
    try {
        await app.listen(listenOptions);
    } catch (error) {
        await app.close();
        throw error;
    }

    const address = app.server.address();
    return {
        app,
        host: address.address,
        port: address.port,
        databasePath,
        close: () => app.close(),
    };
}
