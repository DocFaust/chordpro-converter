import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../src/App.jsx";

vi.mock("../src/nextcloud/settings.js", () => ({
    loadSettings: vi.fn(),
    saveSettings: vi.fn(),
    hasValidSettings: vi.fn(),
}));

vi.mock("../src/nextcloud/client.js", () => ({
    sanitizeFileName: vi.fn((title) => `${title || "chordpro_file"}.chord`),
    uploadFile: vi.fn(),
}));

import { hasValidSettings, loadSettings } from "../src/nextcloud/settings.js";
import { uploadFile } from "../src/nextcloud/client.js";

function getEditableTextarea() {
    return screen.getAllByRole("textbox").find(
        (el) => el.tagName === "TEXTAREA" && !el.readOnly
    );
}

function getOutputTextarea() {
    return screen.getAllByRole("textbox").find(
        (el) => el.tagName === "TEXTAREA" && el.readOnly
    );
}

describe("App", () => {
    let writeTextMock;

    beforeEach(() => {
        vi.clearAllMocks();
        hasValidSettings.mockReturnValue(false);
        loadSettings.mockReturnValue(null);
        vi.stubGlobal("alert", vi.fn());
        vi.stubGlobal("confirm", vi.fn(() => true));
        writeTextMock = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined);
        URL.createObjectURL = vi.fn(() => "blob:mock");
        URL.revokeObjectURL = vi.fn();
    });

    afterEach(() => {
        writeTextMock.mockRestore();
        cleanup();
    });

    it("converts input to ChordPro output", async () => {
        const user = userEvent.setup();
        render(<App />);

        await user.type(screen.getByLabelText("Titel"), "Test Song");
        await user.click(getEditableTextarea());
        await user.type(getEditableTextarea(), "E H7\nZeile eins");
        await user.click(screen.getByRole("button", { name: "Umwandeln" }));

        expect(getOutputTextarea().value).toContain("{title: Test Song}");
        expect(getOutputTextarea().value).toContain("[E]");
    });

    it("clears all fields", async () => {
        const user = userEvent.setup();
        render(<App />);

        await user.type(screen.getByLabelText("Titel"), "Test");
        await user.click(getEditableTextarea());
        await user.type(getEditableTextarea(), "Input");
        await user.click(screen.getByRole("button", { name: "Löschen" }));

        expect(screen.getByLabelText("Titel")).toHaveValue("");
        expect(getEditableTextarea()).toHaveValue("");
    });

    it("copies output to clipboard", async () => {
        const user = userEvent.setup();
        render(<App />);

        await user.click(getEditableTextarea());
        await user.type(getEditableTextarea(), "E\nText");
        await user.click(screen.getByRole("button", { name: "Umwandeln" }));
        await waitFor(() => expect(getOutputTextarea().value).toContain("[E]"));
        await user.click(screen.getByRole("button", { name: "In Zwischenablage kopieren" }));

        await waitFor(() => expect(writeTextMock).toHaveBeenCalled());
        expect(alert).toHaveBeenCalledWith("Ausgabe in die Zwischenablage kopiert!");
    });

    it("downloads file without cloud upload", async () => {
        const user = userEvent.setup();
        const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

        render(<App />);

        await user.type(screen.getByLabelText("Titel"), "MySong");
        await user.click(getEditableTextarea());
        await user.type(getEditableTextarea(), "G D\nLine");
        await user.click(screen.getByRole("button", { name: "Umwandeln" }));
        await user.click(screen.getByRole("button", { name: "Download als Datei" }));

        expect(clickSpy).toHaveBeenCalled();

        clickSpy.mockRestore();
    });

    it("opens settings modal when uploading without valid settings", async () => {
        hasValidSettings.mockReturnValue(false);
        const user = userEvent.setup();
        render(<App />);

        await user.click(getEditableTextarea());
        await user.type(getEditableTextarea(), "G\nLine");
        await user.click(screen.getByRole("button", { name: "Umwandeln" }));
        await waitFor(() => expect(getOutputTextarea().value).not.toBe(""));
        await user.click(screen.getByRole("button", { name: "Zu Nextcloud hochladen" }));

        await waitFor(() => {
            expect(screen.getByLabelText("Server-URL")).toBeInTheDocument();
        });
    });

    it("uploads file when settings are valid and upload is confirmed", async () => {
        hasValidSettings.mockReturnValue(true);
        loadSettings.mockReturnValue({
            baseUrl: "https://cloud.example.com",
            username: "user",
            password: "pass",
            folderPath: "Band",
        });
        uploadFile.mockResolvedValue(undefined);
        const user = userEvent.setup();
        render(<App />);

        await user.type(screen.getByLabelText("Titel"), "MySong");
        await user.click(getEditableTextarea());
        await user.type(getEditableTextarea(), "G\nLine");
        await user.click(screen.getByRole("button", { name: "Umwandeln" }));
        await user.click(screen.getByRole("button", { name: "Zu Nextcloud hochladen" }));

        await waitFor(() => expect(uploadFile).toHaveBeenCalled());
        expect(confirm).toHaveBeenCalled();
        expect(alert).toHaveBeenCalledWith('"MySong.chord" wurde hochgeladen!');
    });

    it("shows error alert when upload fails", async () => {
        hasValidSettings.mockReturnValue(true);
        loadSettings.mockReturnValue({
            baseUrl: "https://cloud.example.com",
            username: "user",
            password: "pass",
            folderPath: "Band",
        });
        uploadFile.mockRejectedValue(new Error("Netzwerkfehler"));
        const user = userEvent.setup();
        render(<App />);

        await user.click(getEditableTextarea());
        await user.type(getEditableTextarea(), "G\nLine");
        await user.click(screen.getByRole("button", { name: "Umwandeln" }));
        await user.click(screen.getByRole("button", { name: "Zu Nextcloud hochladen" }));

        await waitFor(() => {
            expect(alert).toHaveBeenCalledWith("Upload fehlgeschlagen:\nNetzwerkfehler");
        });
    });

    it("disables upload button when output is empty", () => {
        render(<App />);
        expect(screen.getByRole("button", { name: "Zu Nextcloud hochladen" })).toBeDisabled();
    });
});
