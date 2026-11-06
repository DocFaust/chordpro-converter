// Bewusste Entscheidung: 400 Tage entsprechen der üblichen Obergrenze, die Browser
// für ein Cookie akzeptieren. Das ist keine fachliche Sitzungsdauer. Der Server
// speichert kein Ablaufdatum und widerruft jede Sitzung sofort, sobald abgemeldet,
// das Passwort geändert, das Passwort zurückgesetzt oder das Konto deaktiviert wird.
export const SESSION_COOKIE = "cpc_session";
export const SESSION_MAX_AGE_SECONDS = 400 * 24 * 60 * 60;

export function sessionCookieHeader(token, { secure }) {
    const parts = [
        `${SESSION_COOKIE}=${token}`,
        "HttpOnly",
        "SameSite=Strict",
        "Path=/",
        `Max-Age=${SESSION_MAX_AGE_SECONDS}`,
    ];
    if (secure) {
        parts.push("Secure");
    }
    return parts.join("; ");
}

export function clearSessionCookieHeader({ secure }) {
    const parts = [
        `${SESSION_COOKIE}=`,
        "HttpOnly",
        "SameSite=Strict",
        "Path=/",
        "Max-Age=0",
    ];
    if (secure) {
        parts.push("Secure");
    }
    return parts.join("; ");
}

export function readSessionToken(cookieHeader) {
    const header = Array.isArray(cookieHeader) ? cookieHeader.join("; ") : cookieHeader;
    if (typeof header !== "string" || header.length === 0) {
        return null;
    }
    for (const part of header.split(";")) {
        const separator = part.indexOf("=");
        if (separator === -1) {
            continue;
        }
        const name = part.slice(0, separator).trim();
        if (name === SESSION_COOKIE) {
            const value = part.slice(separator + 1).trim();
            return value.length > 0 ? value : null;
        }
    }
    return null;
}
