// @vitest-environment node
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { start } from "../../server/app.js";
import { clickButton, launchChrome, setField, waitForId, waitForText } from "./browser.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const TOKEN = "test-setup-token";
const ADMIN_PASSWORD = "ada-password-1";
const MEMBER_PASSWORD = "ben-password-1";
const directories = [];

let backend;
let frontend;
let browser;
let page;
let pageUrl;

beforeAll(async () => {
    const databasePath = path.join(mkdtempSync(path.join(tmpdir(), "cpc-e2e-")), "cpc.sqlite");
    directories.push(path.dirname(databasePath));
    backend = await start({
        host: "127.0.0.1",
        port: 0,
        databasePath,
        setupToken: TOKEN,
    });
    frontend = await createServer({
        configFile: false,
        root,
        plugins: [react()],
        server: {
            host: "127.0.0.1",
            port: 0,
            strictPort: false,
            proxy: {
                "/api": {
                    target: `http://127.0.0.1:${backend.port}`,
                    changeOrigin: false,
                },
            },
        },
        logLevel: "error",
    });
    await frontend.listen();
    const address = frontend.httpServer.address();
    pageUrl = `http://127.0.0.1:${address.port}/`;
    browser = await launchChrome();
    page = await browser.open(pageUrl);
}, 120000);

afterAll(async () => {
    page?.close();
    browser?.close();
    await frontend?.close();
    await backend?.close();
    while (directories.length > 0) {
        rmSync(directories.pop(), { recursive: true, force: true });
    }
});

describe("Konten im Browser", () => {
    it("meldet an und ab und legt ein Konto an", async () => {
        await waitForText(page, "Umwandeln");
        await waitForText(page, "Einrichten");
        const converterVisible = await page.evaluate(`Boolean([...document.querySelectorAll("button")].find((button) => button.textContent.trim() === "Umwandeln"))`);
        expect(converterVisible).toBe(true);
        expect(await page.evaluate(`document.getElementById("setup-token") === null`)).toBe(true);

        await clickButton(page, "Einrichten");
        await waitForId(page, "setup-token");
        const converterDuringSetup = await page.evaluate(`Boolean([...document.querySelectorAll("button")].find((button) => button.textContent.trim() === "Umwandeln"))`);
        expect(converterDuringSetup).toBe(true);

        await setField(page, "setup-token", TOKEN);
        await setField(page, "setup-username", "Ada");
        await setField(page, "setup-password", ADMIN_PASSWORD);
        await clickButton(page, "Einrichtung abschließen");
        await clickButton(page, "Ada");
        await waitForText(page, "Angemeldet als");

        await clickButton(page, "Abmelden");
        await clickButton(page, "Anmelden");
        await waitForId(page, "login-username");
        await setField(page, "login-username", "ADA");
        await setField(page, "login-password", ADMIN_PASSWORD);
        await clickButton(page, "Anmelden");
        await clickButton(page, "Ada");
        await waitForText(page, "Angemeldet als");
        await clickButton(page, "Konten verwalten");
        await waitForId(page, "create-username");
        expect(await page.evaluate("document.body.innerText")).toContain("Ada");
        expect(await page.evaluate(`document.querySelector("[id^='reset-password-']") === null`)).toBe(true);

        await setField(page, "create-username", "Ben");
        await setField(page, "create-password", MEMBER_PASSWORD);
        await clickButton(page, "Konto anlegen");
        await waitForText(page, "Ben");
        await waitForText(page, "persönlich mitteilen");
        await waitForText(page, "keine E-Mail");

        await clickButton(page, "Schließen");
        await clickButton(page, "Ada");
        await clickButton(page, "Abmelden");
        await clickButton(page, "Anmelden");
        await waitForId(page, "login-username");
        const stillConverts = await page.evaluate(`Boolean([...document.querySelectorAll("button")].find((button) => button.textContent.trim() === "Umwandeln" && !button.disabled))`);
        expect(stillConverts).toBe(true);
    }, 120000);
});
