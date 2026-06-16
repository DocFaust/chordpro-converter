import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, within, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NextcloudSettingsModal from "../../src/components/NextcloudSettingsModal.jsx";

vi.mock("../../src/nextcloud/client.js", () => ({
    listFolders: vi.fn(),
}));

vi.mock("../../src/nextcloud/settings.js", () => ({
    loadSettings: vi.fn(),
    saveSettings: vi.fn(),
}));

import { listFolders } from "../../src/nextcloud/client.js";
import { loadSettings, saveSettings } from "../../src/nextcloud/settings.js";

describe("NextcloudSettingsModal", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        loadSettings.mockReturnValue(null);
        vi.stubGlobal("alert", vi.fn());
    });

    afterEach(() => {
        cleanup();
    });

    it("renders form fields", () => {
        render(<NextcloudSettingsModal show={true} onHide={vi.fn()} />);

        const dialog = screen.getByRole("dialog");
        expect(within(dialog).getByLabelText("Server-URL")).toBeInTheDocument();
        expect(within(dialog).getByLabelText("Zielordner")).toBeInTheDocument();
    });

    it("lists folders and selects on Auswählen click", async () => {
        listFolders.mockResolvedValue(["Band"]);
        const user = userEvent.setup();

        render(<NextcloudSettingsModal show={true} onHide={vi.fn()} />);

        const dialog = screen.getByRole("dialog");
        await user.type(within(dialog).getByLabelText("Server-URL"), "https://cloud.example.com");
        await user.type(within(dialog).getByLabelText("Benutzername"), "user");
        await user.type(within(dialog).getByLabelText("App-Passwort"), "pass");
        await user.click(within(dialog).getByRole("button", { name: "Ordner anzeigen" }));

        await waitFor(() => expect(within(dialog).getByText("Band")).toBeInTheDocument());
        await user.click(within(dialog).getByRole("button", { name: "Auswählen" }));

        expect(within(dialog).getByLabelText("Zielordner")).toHaveValue("Band");
    });

    it("saves settings on submit", async () => {
        loadSettings.mockReturnValue({
            baseUrl: "https://cloud.example.com",
            username: "user",
            password: "pass",
            folderPath: "Band",
        });
        const user = userEvent.setup();
        const onHide = vi.fn();

        render(<NextcloudSettingsModal show={true} onHide={onHide} />);

        const dialog = screen.getByRole("dialog");
        await user.click(within(dialog).getByRole("button", { name: "Speichern" }));

        expect(saveSettings).toHaveBeenCalledWith({
            baseUrl: "https://cloud.example.com",
            username: "user",
            password: "pass",
            folderPath: "Band",
        });
        expect(onHide).toHaveBeenCalled();
    });
});
