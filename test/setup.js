import "@testing-library/jest-dom/vitest";

// Node ab Version 25 legt localStorage als leeren Getter an, solange
// --localstorage-file fehlt. Die Browser-Tests erwarten ein nutzbares Storage.
if (typeof globalThis.localStorage === "undefined") {
    const items = new Map();
    const storage = {
        get length() {
            return items.size;
        },
        clear() {
            items.clear();
        },
        getItem(key) {
            const value = items.get(String(key));
            return value === undefined ? null : value;
        },
        key(index) {
            return [...items.keys()][index] ?? null;
        },
        removeItem(key) {
            items.delete(String(key));
        },
        setItem(key, value) {
            items.set(String(key), String(value));
        },
    };

    Object.defineProperty(globalThis, "localStorage", {
        configurable: true,
        enumerable: true,
        writable: true,
        value: storage,
    });
}
