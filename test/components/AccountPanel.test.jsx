import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AccountPanel from "../../src/components/AccountPanel.jsx";
import { ApiError } from "../../src/accounts/api.js";

vi.mock("../../src/accounts/api.js", async () => {
    const actual = await vi.importActual("../../src/accounts/api.js");
    return {
        ...actual,
        loadSession: vi.fn(),
        setupAccount: vi.fn(),
        login: vi.fn(),
        logout: vi.fn(),
        changePassword: vi.fn(),
        listAccounts: vi.fn(),
        createAccount: vi.fn(),
        deactivateAccount: vi.fn(),
        activateAccount: vi.fn(),
        resetAccountPassword: vi.fn(),
    };
});

const {
    loadSession,
    setupAccount,
    login,
    logout,
    changePassword,
    listAccounts,
    createAccount,
    deactivateAccount,
    activateAccount,
    resetAccountPassword,
} = await import("../../src/accounts/api.js");

const admin = {
    id: 1,
    username: "Ada",
    administrator: true,
    disabled: false,
    mustChangePassword: false,
};

const member = {
    id: 2,
    username: "Ben",
    administrator: false,
    disabled: false,
    mustChangePassword: false,
};

describe("AccountPanel", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        listAccounts.mockResolvedValue({ accounts: [admin] });
    });

    afterEach(() => {
        cleanup();
    });

    it("richtet das Administratorkonto ein und zeigt danach die Konten", async () => {
        const user = userEvent.setup();
        loadSession
            .mockResolvedValueOnce({ phase: "setup", account: null })
            .mockResolvedValueOnce({ phase: "authenticated", account: admin });
        setupAccount.mockResolvedValue(admin);
        render(<AccountPanel />);

        await user.type(await screen.findByLabelText("Einrichtungstoken"), "token");
        await user.type(screen.getByLabelText("Benutzername"), "Ada");
        await user.type(screen.getByLabelText("Passwort"), "geheim");
        await user.click(screen.getByRole("button", { name: "Einrichtung abschließen" }));

        expect(await screen.findByText(/Angemeldet als/)).toBeInTheDocument();
        expect(screen.getByLabelText("Benutzername")).toHaveValue("");
        expect(screen.getAllByText("Ada").length).toBeGreaterThan(0);
        expect(screen.getByText(/keine E-Mail/)).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Abmelden" })).toHaveClass("btn-lg");
        expect(setupAccount).toHaveBeenCalledWith({
            username: "Ada",
            password: "geheim",
            setupToken: "token",
        });
    });

    it("zeigt eine fehlgeschlagene Anmeldung und meldet danach an", async () => {
        const user = userEvent.setup();
        loadSession
            .mockResolvedValueOnce({ phase: "login", account: null })
            .mockResolvedValueOnce({ phase: "authenticated", account: member });
        login.mockRejectedValueOnce(new ApiError(401, "login_failed"));
        login.mockResolvedValueOnce(member);
        render(<AccountPanel />);

        await user.type(await screen.findByLabelText("Benutzername"), "Ben");
        await user.type(screen.getByLabelText("Passwort"), "falsch");
        await user.click(screen.getByRole("button", { name: "Anmelden" }));
        expect(await screen.findByText("Anmeldung fehlgeschlagen.")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Anmelden" })).toHaveClass("btn-lg");

        await user.clear(screen.getByLabelText("Passwort"));
        await user.type(screen.getByLabelText("Passwort"), "geheim");
        await user.click(screen.getByRole("button", { name: "Anmelden" }));
        expect(await screen.findByText("Ben")).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Konto anlegen" })).not.toBeInTheDocument();
    });

    it("öffnet das Anlegeformular nach der Anmeldung ohne den eigenen Benutzernamen", async () => {
        const user = userEvent.setup();
        loadSession
            .mockResolvedValueOnce({ phase: "login", account: null })
            .mockResolvedValueOnce({ phase: "authenticated", account: admin });
        login.mockResolvedValue(admin);
        render(<AccountPanel />);

        await user.type(await screen.findByLabelText("Benutzername"), "Ada");
        await user.type(screen.getByLabelText("Passwort"), "geheim");
        await user.click(screen.getByRole("button", { name: "Anmelden" }));

        expect(await screen.findByRole("button", { name: "Konto anlegen" })).toBeInTheDocument();
        expect(screen.getByLabelText("Benutzername")).toHaveValue("");
        expect(screen.getByLabelText("Passwort")).toHaveValue("");
    });

    it("legt ein Konto an, setzt zurück und deaktiviert mit Bestätigung", async () => {
        const user = userEvent.setup();
        loadSession.mockResolvedValue({ phase: "authenticated", account: admin });
        listAccounts.mockResolvedValue({ accounts: [admin, member] });
        createAccount.mockResolvedValue(member);
        deactivateAccount.mockResolvedValue({ ...member, disabled: true });
        activateAccount.mockResolvedValue(member);
        resetAccountPassword.mockResolvedValue({ ...member, mustChangePassword: true });
        render(<AccountPanel />);

        await user.type(await screen.findByLabelText("Benutzername"), "Ben");
        await user.type(screen.getByLabelText("Passwort"), "mitglied");
        await user.click(screen.getByLabelText("Administrator"));
        await user.click(screen.getByRole("button", { name: "Konto anlegen" }));
        expect(await screen.findByText(/persönlich mitteilen/)).toBeInTheDocument();
        expect(createAccount).toHaveBeenCalledWith({
            username: "Ben",
            password: "mitglied",
            administrator: true,
        });

        await user.type(screen.getByLabelText("Temporäres Passwort für Ben"), "temporaer");
        await user.click(screen.getAllByRole("button", { name: "Passwort zurücksetzen" })[1]);
        await user.click(screen.getByRole("button", { name: "Zurücksetzen bestätigen" }));
        expect(resetAccountPassword).toHaveBeenCalledWith(2, "temporaer");
        expect(await screen.findByText(/persönlich mitteilen/)).toBeInTheDocument();

        await user.click(screen.getAllByRole("button", { name: "Deaktivieren" })[1]);
        await user.click(screen.getByRole("button", { name: "Abbrechen" }));
        await user.click(screen.getAllByRole("button", { name: "Deaktivieren" })[1]);
        await user.click(screen.getByRole("button", { name: "Deaktivieren bestätigen" }));
        expect(deactivateAccount).toHaveBeenCalledWith(2);
    });

    it("erlaubt in der erzwungenen Änderung nur das eigene Passwort", async () => {
        const user = userEvent.setup();
        loadSession
            .mockResolvedValueOnce({
                phase: "mustChange",
                account: { ...member, mustChangePassword: true },
            })
            .mockResolvedValueOnce({ phase: "login", account: null });
        changePassword.mockResolvedValue(null);
        render(<AccountPanel />);

        expect(await screen.findByText(/muss geändert werden/)).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Konto anlegen" })).not.toBeInTheDocument();
        await user.type(screen.getByLabelText("Aktuelles Passwort"), "temporaer");
        await user.type(screen.getByLabelText("Neues Passwort"), "neu");
        await user.click(screen.getByRole("button", { name: "Passwort speichern" }));
        expect(await screen.findByText(/Bitte neu anmelden/)).toBeInTheDocument();
        expect(changePassword).toHaveBeenCalledWith({
            currentPassword: "temporaer",
            newPassword: "neu",
        });
    });

    it("meldet ab und zeigt, wenn die Konten nicht erreichbar sind", async () => {
        const user = userEvent.setup();
        loadSession
            .mockResolvedValueOnce({ phase: "authenticated", account: member })
            .mockResolvedValueOnce({ phase: "login", account: null });
        logout.mockResolvedValue(null);
        render(<AccountPanel />);
        await user.click(await screen.findByRole("button", { name: "Abmelden" }));
        expect(await screen.findByRole("button", { name: "Anmelden" })).toBeInTheDocument();

        cleanup();
        loadSession.mockRejectedValueOnce(new ApiError(0, "network_error"));
        render(<AccountPanel />);
        expect(await screen.findByText("Die Konten sind gerade nicht erreichbar.")).toBeInTheDocument();
    });

    it("ändert das eigene Passwort aus der angemeldeten Ansicht", async () => {
        const user = userEvent.setup();
        loadSession
            .mockResolvedValueOnce({ phase: "authenticated", account: member })
            .mockResolvedValueOnce({ phase: "login", account: null });
        changePassword.mockResolvedValue(null);
        render(<AccountPanel />);
        await user.click(await screen.findByRole("button", { name: "Eigenes Passwort ändern" }));
        await user.type(screen.getByLabelText("Aktuelles Passwort"), "alt");
        await user.type(screen.getByLabelText("Neues Passwort"), "neu");
        await user.click(screen.getByRole("button", { name: "Passwort speichern" }));
        expect(changePassword).toHaveBeenCalledWith({ currentPassword: "alt", newPassword: "neu" });
        expect(await screen.findByRole("button", { name: "Anmelden" })).toBeInTheDocument();
    });

    it("zeigt die Ablehnung, wenn der letzte Administrator deaktiviert werden soll", async () => {
        const user = userEvent.setup();
        loadSession.mockResolvedValue({ phase: "authenticated", account: admin });
        listAccounts.mockResolvedValue({ accounts: [admin] });
        deactivateAccount.mockRejectedValue(new ApiError(409, "last_administrator"));
        render(<AccountPanel />);

        await user.click(await screen.findByRole("button", { name: "Deaktivieren" }));
        await user.click(screen.getByRole("button", { name: "Deaktivieren bestätigen" }));

        expect(await screen.findByText(
            "Der letzte aktive Administrator kann nicht deaktiviert werden.",
        )).toBeInTheDocument();
        expect(screen.getByText(/Angemeldet als/)).toBeInTheDocument();
    });

    it("aktiviert ein deaktiviertes Konto wieder", async () => {
        const user = userEvent.setup();
        loadSession.mockResolvedValue({ phase: "authenticated", account: admin });
        listAccounts.mockResolvedValue({
            accounts: [admin, { ...member, disabled: true }],
        });
        activateAccount.mockResolvedValue(member);
        render(<AccountPanel />);
        await user.click(await screen.findByRole("button", { name: "Aktivieren" }));
        expect(activateAccount).toHaveBeenCalledWith(2);
    });
});
