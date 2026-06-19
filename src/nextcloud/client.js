import axios from "axios";

const INVALID_FILE_CHARS = /[/\\:*?"<>|]/g;

export function sanitizeFileName(title) {
    const base = (title || "chordpro_file").replace(INVALID_FILE_CHARS, "_").trim();
    return `${base || "chordpro_file"}.chord`;
}

export function buildDavUrl(baseUrl, username, path = "") {
    const normalizedBase = baseUrl.replace(/\/+$/, "");
    const segments = path
        .split("/")
        .filter(Boolean)
        .map((segment) => encodeURIComponent(segment));
    const pathSuffix = segments.length > 0 ? `/${segments.join("/")}` : "";
    return `${normalizedBase}/remote.php/dav/files/${encodeURIComponent(username)}${pathSuffix}`;
}

function authHeader(username, password) {
    return `Basic ${btoa(`${username}:${password}`)}`;
}

function normalizeXmlNamespaces(xmlText) {
    return xmlText
        .replace(/xmlns(:\w+)?="[^"]*"/g, "")
        .replace(/(<\/?)\w+:/g, "$1");
}

export function parseFolderList(xmlText) {
    const doc = new DOMParser().parseFromString(normalizeXmlNamespaces(xmlText), "application/xml");
    const responses = doc.getElementsByTagName("response");
    const folders = [];

    for (const response of responses) {
        const href = response.getElementsByTagName("href")[0]?.textContent ?? "";
        const isCollection = response.getElementsByTagName("collection").length > 0;
        if (!isCollection) {
            continue;
        }

        const decodedHref = decodeURIComponent(href);
        const parts = decodedHref.split("/").filter(Boolean);
        const name = parts.at(-1);
        if (!name) {
            continue;
        }

        folders.push(name);
    }

    return [...new Set(folders)].sort((a, b) => a.localeCompare(b));
}

function formatUploadError(error) {
    if (error.response?.status === 401) {
        return "Ungültige Anmeldedaten";
    }
    if (error.response?.status === 404) {
        return "Ordner nicht gefunden";
    }
    if (error.response?.status === 409) {
        return "Zielordner existiert nicht — bitte in den Einstellungen neu wählen";
    }
    if (error.code === "ERR_NETWORK" || !error.response) {
        return "Netzwerkfehler — oft CORS beim PUT. DevTools → Netzwerk: OPTIONS/PUT prüfen";
    }
    const status = error.response?.status;
    return status
        ? `Upload fehlgeschlagen (HTTP ${status})`
        : (error.message || "Unbekannter Fehler beim Upload");
}

function isUploadSuccess(status) {
    return status === 200 || status === 201 || status === 204;
}

export async function listFolders(config, folderPath = "") {
    const url = buildDavUrl(config.baseUrl, config.username, folderPath);

    try {
        const response = await axios.request({
            method: "PROPFIND",
            url,
            headers: {
                Authorization: authHeader(config.username, config.password),
                Depth: "1",
                "Content-Type": "application/xml",
            },
            data: `<?xml version="1.0"?>
<d:propfind xmlns:d="DAV:">
  <d:prop><d:resourcetype/></d:prop>
</d:propfind>`,
        });

        const folders = parseFolderList(response.data);
        const currentFolderName = folderPath.split("/").filter(Boolean).at(-1);
        return folders.filter((name) => name !== currentFolderName && name !== config.username);
    } catch (error) {
        throw new Error(formatUploadError(error));
    }
}

export async function uploadFile(config, folderPath, fileName, content) {
    if (!config?.baseUrl || !config?.username || !config?.password) {
        throw new Error("Nextcloud-Einstellungen unvollständig — bitte erneut speichern");
    }

    const filePath = folderPath ? `${folderPath}/${fileName}` : fileName;
    const url = buildDavUrl(config.baseUrl, config.username, filePath);

    try {
        const response = await axios.put(url, content, {
            headers: {
                Authorization: authHeader(config.username, config.password),
                "Content-Type": "text/plain",
            },
        });

        if (!isUploadSuccess(response.status)) {
            throw new Error(`Upload fehlgeschlagen (HTTP ${response.status})`);
        }
    } catch (error) {
        if (error.message?.startsWith("Upload fehlgeschlagen")
            || error.message?.includes("Einstellungen unvollständig")) {
            throw error;
        }
        throw new Error(formatUploadError(error));
    }
}
