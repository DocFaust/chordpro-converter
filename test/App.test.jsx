import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../src/App.jsx";
import { saveFile } from "../src/saveToOwncloud.js";

vi.mock("../src/saveToOwncloud.js", () => ({
    saveFile: vi.fn().mockResolvedValue(undefined),
}));

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
        vi.stubGlobal("alert", vi.fn());
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

    it("downloads file and triggers ownCloud upload", async () => {
        const user = userEvent.setup();
        const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

        render(<App />);

        await user.type(screen.getByLabelText("Titel"), "MySong");
        await user.click(getEditableTextarea());
        await user.type(getEditableTextarea(), "G D\nLine");
        await user.click(screen.getByRole("button", { name: "Umwandeln" }));
        await user.click(screen.getByRole("button", { name: "Download als Datei" }));

        expect(clickSpy).toHaveBeenCalled();
        expect(saveFile).toHaveBeenCalledWith("MySong", expect.any(Blob));
        expect(alert).toHaveBeenCalledWith("Datei wurde gespeichert!");

        clickSpy.mockRestore();
    });

    it("shows error alert when ownCloud upload fails", async () => {
        const user = userEvent.setup();
        saveFile.mockRejectedValueOnce(new Error("upload failed"));
        vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

        render(<App />);

        await user.click(getEditableTextarea());
        await user.type(getEditableTextarea(), "G\nLine");
        await user.click(screen.getByRole("button", { name: "Umwandeln" }));
        await user.click(screen.getByRole("button", { name: "Download als Datei" }));

        expect(alert).toHaveBeenCalledWith("Fehler beim Speichern: Error: upload failed");
    });
});
