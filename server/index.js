import path from "node:path";
import { pathToFileURL } from "node:url";
import { start } from "./app.js";

export function isDirectRun(entry = process.argv[1], moduleUrl = import.meta.url) {
    if (!entry) {
        return false;
    }
    return moduleUrl === pathToFileURL(path.resolve(entry)).href;
}

export function runDirect(entry = process.argv[1]) {
    if (!isDirectRun(entry)) {
        return Promise.resolve();
    }

    return start({ logger: false }).then((started) => {
        console.log(`Erreichbar unter http://${started.host}:${started.port}/api/health`);
        return started;
    }).catch((error) => {
        console.error(error.message);
        process.exit(1);
    });
}

runDirect();
