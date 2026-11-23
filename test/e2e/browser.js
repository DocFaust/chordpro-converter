import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

export function findChrome() {
    if (process.env.CHROME_PATH && existsSync(process.env.CHROME_PATH)) {
        return process.env.CHROME_PATH;
    }
    const candidates = [
        "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
        "/usr/bin/google-chrome-stable",
        "/usr/bin/google-chrome",
        "/usr/bin/chromium",
        "/usr/bin/chromium-browser",
    ];
    return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

function delay(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

async function waitForDebugPort(userDataDir) {
    const portFile = path.join(userDataDir, "DevToolsActivePort");
    const started = Date.now();
    while (Date.now() - started < 15000) {
        if (existsSync(portFile)) {
            const [port, browserPath] = readFileSync(portFile, "utf8").trim().split("\n");
            if (port && browserPath) {
                return { port: Number(port.trim()), browserPath: browserPath.trim() };
            }
        }
        await delay(50);
    }
    throw new Error("Chrome hat keinen Debug-Port geöffnet.");
}

export async function launchChrome() {
    const executable = findChrome();
    if (!executable) {
        throw new Error("Google Chrome wurde nicht gefunden. CHROME_PATH setzen.");
    }
    const userDataDir = mkdtempSync(path.join(tmpdir(), "cpc-chrome-"));
    const child = spawn(executable, [
        "--headless=new",
        "--disable-gpu",
        "--no-sandbox",
        "--disable-dev-shm-usage",
        "--no-first-run",
        "--no-default-browser-check",
        "--disable-extensions",
        "--remote-allow-origins=*",
        `--user-data-dir=${userDataDir}`,
        "--remote-debugging-port=0",
        "about:blank",
    ], { stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    child.stderr.on("data", (chunk) => {
        output += chunk.toString();
    });
    child.stdout.on("data", (chunk) => {
        output += chunk.toString();
    });
    try {
        const debug = await waitForDebugPort(userDataDir);
        return {
            port: debug.port,
            async open(url) {
                const response = await fetch(`http://127.0.0.1:${debug.port}/json/new?${encodeURIComponent(url)}`, {
                    method: "PUT",
                });
                if (!response.ok) {
                    throw new Error(`Chrome-Tab fehlgeschlagen: ${response.status} ${await response.text()}`);
                }
                const target = await response.json();
                return PageSession.connect(target.webSocketDebuggerUrl);
            },
            close() {
                if (process.platform === "win32") {
                    spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
                } else {
                    child.kill();
                }
                for (let attempt = 0; attempt < 20; attempt += 1) {
                    try {
                        rmSync(userDataDir, { recursive: true, force: true });
                        return;
                    } catch {
                        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
                    }
                }
            },
        };
    } catch (error) {
        child.kill();
        rmSync(userDataDir, { recursive: true, force: true });
        throw new Error(`${error.message}\n${output}`);
    }
}

class PageSession {
    constructor(ws) {
        this.ws = ws;
        this.nextId = 0;
        this.pending = new Map();
    }

    static async connect(webSocketDebuggerUrl) {
        const ws = new WebSocket(webSocketDebuggerUrl);
        await new Promise((resolve, reject) => {
            ws.addEventListener("open", resolve, { once: true });
            ws.addEventListener("error", () => reject(new Error("Debug-Verbindung fehlgeschlagen")), { once: true });
        });
        const page = new PageSession(ws);
        ws.addEventListener("message", (event) => {
            const message = JSON.parse(event.data);
            if (!message.id || !page.pending.has(message.id)) {
                return;
            }
            const pending = page.pending.get(message.id);
            page.pending.delete(message.id);
            if (message.error) {
                pending.reject(new Error(message.error.message));
            } else {
                pending.resolve(message.result);
            }
        });
        await page.send("Runtime.enable");
        return page;
    }

    send(method, params = {}) {
        const id = this.nextId + 1;
        this.nextId = id;
        return new Promise((resolve, reject) => {
            this.pending.set(id, { resolve, reject });
            this.ws.send(JSON.stringify({ id, method, params }));
        });
    }

    async evaluate(expression) {
        const result = await this.send("Runtime.evaluate", {
            expression,
            awaitPromise: true,
            returnByValue: true,
        });
        if (result.exceptionDetails) {
            throw new Error(result.exceptionDetails.exception?.description
                ?? result.exceptionDetails.text
                ?? "Skriptfehler im Browser");
        }
        return result.result?.value;
    }

    close() {
        this.ws.close();
    }
}

export async function setField(page, id, value) {
    await page.evaluate(`(() => {
        const element = document.getElementById(${JSON.stringify(id)});
        if (!element) {
            throw new Error(${JSON.stringify(`Feld fehlt: ${id}`)});
        }
        const prototype = element instanceof HTMLTextAreaElement
            ? HTMLTextAreaElement.prototype
            : HTMLInputElement.prototype;
        const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");
        descriptor.set.call(element, ${JSON.stringify(value)});
        element.dispatchEvent(new Event("input", { bubbles: true }));
        element.dispatchEvent(new Event("change", { bubbles: true }));
        return true;
    })()`);
}

export async function clickButton(page, name) {
    const started = Date.now();
    while (Date.now() - started < 10000) {
        const clicked = await page.evaluate(`(() => {
            const button = [...document.querySelectorAll("button")].find((element) => element.textContent.trim() === ${JSON.stringify(name)} && !element.disabled);
            if (!button) return false;
            button.click();
            return true;
        })()`);
        if (clicked) {
            return;
        }
        await delay(50);
    }
    throw new Error(`Schaltfläche fehlt: ${name}\n${await page.evaluate("document.body?.innerText ?? ''")}`);
}

export async function waitForText(page, text, timeout = 15000) {
    const started = Date.now();
    while (Date.now() - started < timeout) {
        const found = await page.evaluate(`document.body?.innerText.includes(${JSON.stringify(text)}) ?? false`);
        if (found) {
            return;
        }
        await delay(50);
    }
    throw new Error(`Text fehlt: ${text}\n${await page.evaluate("document.body?.innerText ?? ''")}`);
}

export async function waitForId(page, id, timeout = 15000) {
    const started = Date.now();
    while (Date.now() - started < timeout) {
        const found = await page.evaluate(`Boolean(document.getElementById(${JSON.stringify(id)}))`);
        if (found) {
            return;
        }
        await delay(50);
    }
    throw new Error(`Feld fehlt: ${id}\n${await page.evaluate("document.body?.innerText ?? ''")}`);
}
