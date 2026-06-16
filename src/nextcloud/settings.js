const STORAGE_KEY = "nextcloud-settings";

export function loadSettings() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            return null;
        }
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

export function saveSettings(settings) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function hasValidSettings(settings = loadSettings()) {
    if (!settings) {
        return false;
    }
    return Boolean(
        settings.baseUrl?.trim()
        && settings.username?.trim()
        && settings.password?.trim()
        && settings.folderPath?.trim()
    );
}
