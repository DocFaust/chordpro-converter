import Fastify from "fastify";
import { openDatabase, resolveDatabasePath } from "./db.js";

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

export function buildApp(database, { logger = false } = {}) {
    const app = Fastify({ logger });

    app.get("/api/health", async (_request, reply) => {
        try {
            database.prepare("SELECT 1 AS ok").get();
        } catch {
            return reply.code(503).send({ status: "unavailable" });
        }
        return { status: "ok" };
    });

    return app;
}

export async function start(options = {}) {
    const databasePath = options.databasePath ?? resolveDatabasePath();
    const database = openDatabase(databasePath);
    const app = buildApp(database, { logger: options.logger ?? false });
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
