import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { clearSessionCookieHeader, readSessionToken, sessionCookieHeader } from "../../server/cookies.js";
import { expectedOrigin, inspectWrite, resolveCookieSecure } from "../../server/http-guard.js";

function request(method, headers, protocol = "http") {
    return { method, headers, protocol };
}

describe("resolveCookieSecure", () => {
    it("folgt der direkten Verbindung und ignoriert Proxy-Header", () => {
        const forwarded = { "x-forwarded-proto": "https" };
        expect(resolveCookieSecure(request("GET", forwarded, "http"), undefined)).toBe(false);
        expect(resolveCookieSecure(request("GET", forwarded, "https"), undefined)).toBe(true);
        expect(resolveCookieSecure(request("GET", forwarded, "http"), "true")).toBe(true);
        expect(resolveCookieSecure(request("GET", forwarded, "https"), "false")).toBe(false);
        expect(resolveCookieSecure(request("GET", {}, "http"), true)).toBe(true);
        expect(resolveCookieSecure(request("GET", {}, "https"), false)).toBe(false);
    });
});

describe("inspectWrite", () => {
    const host = "cpc.example";

    it("lässt lesende Anfragen ohne Origin zu", () => {
        expect(inspectWrite(request("GET", { host }), undefined)).toBeNull();
        expect(inspectWrite(request("HEAD", {}), undefined)).toBeNull();
    });

    it("unterscheidet fehlende und abweichende Origin", () => {
        expect(inspectWrite(request("POST", { host }), undefined)).toEqual({
            status: 403,
            error: "origin_missing",
        });
        expect(inspectWrite(request("POST", { host, origin: "" }), undefined).error).toBe("origin_missing");
        expect(inspectWrite(request("POST", {
            host,
            origin: "https://cpc.example",
            "x-forwarded-proto": "https",
        }), undefined)).toEqual({ status: 403, error: "origin_mismatch" });
        expect(inspectWrite(request("POST", {
            host,
            origin: "https://cpc.example",
            "x-cpc-request": "1",
            "content-type": "application/json",
        }, "http"), "true")).toBeNull();
        expect(expectedOrigin(request("POST", { host: ["cpc.example"] }), undefined)).toBeNull();
        expect(inspectWrite(request("POST", {
            origin: "http://cpc.example",
            "x-cpc-request": "1",
            "content-type": "application/json",
        }), undefined).error).toBe("origin_mismatch");
    });

    it("verlangt den eigenen Header und JSON", () => {
        const headers = { host, origin: "http://cpc.example" };
        expect(inspectWrite(request("PUT", headers), undefined).error).toBe("csrf_header_missing");
        expect(inspectWrite(request("PATCH", {
            ...headers,
            "x-cpc-request": "1",
            "content-type": "text/plain",
        }), undefined)).toEqual({ status: 415, error: "json_required" });
        expect(inspectWrite(request("DELETE", {
            ...headers,
            "x-cpc-request": "1",
            "content-type": "application/json; charset=utf-8",
        }), undefined)).toBeNull();
    });
});

describe("session cookie", () => {
    it("setzt die dokumentierte Lebensdauer und liest nur das eigene Cookie", () => {
        const header = sessionCookieHeader("token-value", { secure: false });
        expect(header).toContain("cpc_session=token-value");
        expect(header).toContain("HttpOnly");
        expect(header).toContain("SameSite=Strict");
        expect(header).toContain("Max-Age=34560000");
        expect(header.includes("Secure")).toBe(false);
        expect(sessionCookieHeader("token-value", { secure: true })).toContain("Secure");
        expect(clearSessionCookieHeader({ secure: true })).toContain("Max-Age=0");
        expect(readSessionToken("other=1; cpc_session=abc")).toBe("abc");
        expect(readSessionToken(["cpc_session="])).toBeNull();
        expect(readSessionToken("cpc_session")).toBeNull();
        expect(readSessionToken(undefined)).toBeNull();
    });
});

describe("Serverquellen", () => {
    it("geben kein CORS frei und vertrauen keinen Proxy-Headern", () => {
        const directory = path.resolve("server");
        const source = readdirSync(directory)
            .filter((name) => name.endsWith(".js"))
            .map((name) => readFileSync(path.join(directory, name), "utf8"))
            .join("\n")
            .toLowerCase();
        expect(source).not.toContain("access-control-allow-origin");
        expect(source).not.toContain("x-forwarded-proto");
        expect(source).not.toContain("x-forwarded-for");
        expect(source).toContain("trustproxy: false");
    });
});
