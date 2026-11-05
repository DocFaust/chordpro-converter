import { parentPort, workerData } from "node:worker_threads";
import { createInitialAdministrator } from "../../server/accounts.js";
import { openDatabase } from "../../server/db.js";
import { AccountError } from "../../server/errors.js";

const database = openDatabase(workerData.databasePath);
try {
    const account = createInitialAdministrator(database, workerData.input);
    parentPort.postMessage({ ok: true, username: account.username });
} catch (error) {
    parentPort.postMessage({
        ok: false,
        code: error instanceof AccountError ? error.code : "error",
        message: error instanceof Error ? error.message : String(error),
    });
} finally {
    database.close();
}
