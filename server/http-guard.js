const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function resolveCookieSecure(request, configured) {
    if (configured === true || configured === "true") {
        return true;
    }
    if (configured === false || configured === "false") {
        return false;
    }
    return request.protocol === "https";
}

export function expectedOrigin(request, configured) {
    const host = request.headers?.host;
    if (typeof host !== "string" || host.length === 0) {
        return null;
    }
    const scheme = resolveCookieSecure(request, configured) ? "https" : request.protocol;
    return `${scheme}://${host}`;
}

function isJsonContentType(value) {
    if (typeof value !== "string") {
        return false;
    }
    return value.split(";")[0].trim().toLowerCase() === "application/json";
}

export function inspectWrite(request, cookieSecure) {
    if (!WRITE_METHODS.has(String(request.method ?? "").toUpperCase())) {
        return null;
    }
    const origin = request.headers?.origin;
    if (typeof origin !== "string" || origin.length === 0) {
        return { status: 403, error: "origin_missing" };
    }
    const expected = expectedOrigin(request, cookieSecure);
    if (!expected || origin !== expected) {
        return { status: 403, error: "origin_mismatch" };
    }
    if (request.headers["x-cpc-request"] !== "1") {
        return { status: 403, error: "csrf_header_missing" };
    }
    if (!isJsonContentType(request.headers["content-type"])) {
        return { status: 415, error: "json_required" };
    }
    return null;
}

export function registerWriteGuard(app, options = {}) {
    app.addHook("onRequest", async (request, reply) => {
        const rejection = inspectWrite(request, options.cookieSecure);
        if (!rejection) {
            return;
        }
        request.log.warn(
            { security: rejection.error, method: request.method, url: request.url },
            "Schreibende Anfrage abgelehnt",
        );
        return reply.code(rejection.status).send({ error: rejection.error });
    });
}
