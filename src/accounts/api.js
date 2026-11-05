export class ApiError extends Error {
    constructor(status, code) {
        super(code);
        this.name = "ApiError";
        this.status = status;
        this.code = code;
    }
}

const MESSAGES = {
    origin_missing: "Die Anfrage wurde abgelehnt, weil die Origin fehlt.",
    origin_mismatch: "Die Anfrage wurde abgelehnt, weil die Origin nicht zur Seite passt.",
    csrf_header_missing: "Die Anfrage wurde abgelehnt.",
    json_required: "Die Anfrage wurde abgelehnt.",
    too_many_attempts: "Zu viele Versuche. Bitte später erneut versuchen.",
    login_failed: "Anmeldung fehlgeschlagen.",
    setup_rejected: "Einrichtung abgelehnt.",
    setup_complete: "Die Einrichtung ist bereits abgeschlossen.",
    username_taken: "Der Benutzername ist bereits vergeben.",
    forbidden: "Dafür fehlt die Berechtigung.",
    password_change_required: "Bitte zuerst das Passwort ändern.",
    password_rejected: "Das Passwort wurde nicht geändert.",
    unauthenticated: "Bitte anmelden.",
    not_found: "Das Konto wurde nicht gefunden.",
    invalid_username: "Der Benutzername ist ungültig.",
    invalid_password: "Das Passwort ist ungültig.",
    bad_request: "Die Anfrage ist ungültig.",
    internal_error: "Die Anfrage ist fehlgeschlagen.",
    network_error: "Die Konten sind gerade nicht erreichbar.",
};

export function messageFor(code) {
    return MESSAGES[code] ?? MESSAGES.internal_error;
}

async function request(path, { method = "GET", body } = {}) {
    const write = method !== "GET" && method !== "HEAD";
    let response;
    try {
        response = await fetch(path, {
            method,
            credentials: "same-origin",
            headers: {
                Accept: "application/json",
                ...(write ? { "X-CPC-Request": "1" } : {}),
                ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
            },
            body: body !== undefined ? JSON.stringify(body) : undefined,
        });
    } catch {
        throw new ApiError(0, "network_error");
    }
    if (response.status === 204) {
        return null;
    }
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new ApiError(response.status, payload.error || "internal_error");
    }
    return payload;
}

export async function loadSession() {
    const setup = await request("/api/setup");
    if (setup.setupRequired) {
        return { phase: "setup", account: null };
    }
    try {
        const account = await request("/api/me");
        return {
            phase: account.mustChangePassword ? "mustChange" : "authenticated",
            account,
        };
    } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
            return { phase: "login", account: null };
        }
        throw error;
    }
}

export function setupAccount(body) {
    return request("/api/setup", { method: "POST", body });
}

export function login(body) {
    return request("/api/login", { method: "POST", body });
}

export function logout() {
    return request("/api/logout", { method: "POST", body: {} });
}

export function changePassword(body) {
    return request("/api/password", { method: "POST", body });
}

export function listAccounts() {
    return request("/api/accounts");
}

export function createAccount(body) {
    return request("/api/accounts", { method: "POST", body });
}

export function deactivateAccount(id) {
    return request(`/api/accounts/${id}/deactivate`, { method: "POST", body: {} });
}

export function activateAccount(id) {
    return request(`/api/accounts/${id}/activate`, { method: "POST", body: {} });
}

export function resetAccountPassword(id, password) {
    return request(`/api/accounts/${id}/password`, { method: "POST", body: { password } });
}
