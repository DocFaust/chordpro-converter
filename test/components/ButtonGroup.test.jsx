import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ButtonGroup from "../../src/components/ButtonGroup.jsx";

describe("ButtonGroup", () => {
    afterEach(() => {
        cleanup();
    });
    it("invokes action callbacks", async () => {
        const user = userEvent.setup();
        const onConvert = vi.fn();
        const onCopy = vi.fn();
        const onDownload = vi.fn();
        const onClear = vi.fn();
        const onNextcloudUpload = vi.fn();
        const onNextcloudSettings = vi.fn();

        render(
            <ButtonGroup
                onConvert={onConvert}
                onCopy={onCopy}
                onDownload={onDownload}
                onClear={onClear}
                onNextcloudUpload={onNextcloudUpload}
                onNextcloudSettings={onNextcloudSettings}
                uploadDisabled={false}
            />
        );

        await user.click(screen.getByRole("button", { name: "Umwandeln" }));
        await user.click(screen.getByRole("button", { name: "In Zwischenablage kopieren" }));
        await user.click(screen.getByRole("button", { name: "Download als Datei" }));
        await user.click(screen.getByRole("button", { name: "Zu Nextcloud hochladen" }));
        await user.click(screen.getByRole("button", { name: "Nextcloud-Einstellungen" }));
        await user.click(screen.getByRole("button", { name: "Löschen" }));

        expect(onConvert).toHaveBeenCalledOnce();
        expect(onCopy).toHaveBeenCalledOnce();
        expect(onDownload).toHaveBeenCalledOnce();
        expect(onNextcloudUpload).toHaveBeenCalledOnce();
        expect(onNextcloudSettings).toHaveBeenCalledOnce();
        expect(onClear).toHaveBeenCalledOnce();
    });

    it("disables upload button when uploadDisabled is true", () => {
        render(
            <ButtonGroup
                onConvert={vi.fn()}
                onCopy={vi.fn()}
                onDownload={vi.fn()}
                onClear={vi.fn()}
                onNextcloudUpload={vi.fn()}
                onNextcloudSettings={vi.fn()}
                uploadDisabled={true}
            />
        );

        expect(screen.getByRole("button", { name: "Zu Nextcloud hochladen" })).toBeDisabled();
    });
});
