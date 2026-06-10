import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ButtonGroup from "../../src/components/ButtonGroup.jsx";

describe("ButtonGroup", () => {
    it("invokes action callbacks", async () => {
        const user = userEvent.setup();
        const onConvert = vi.fn();
        const onCopy = vi.fn();
        const onDownload = vi.fn();
        const onClear = vi.fn();

        render(
            <ButtonGroup
                onConvert={onConvert}
                onCopy={onCopy}
                onDownload={onDownload}
                onClear={onClear}
            />
        );

        await user.click(screen.getByRole("button", { name: "Umwandeln" }));
        await user.click(screen.getByRole("button", { name: "In Zwischenablage kopieren" }));
        await user.click(screen.getByRole("button", { name: "Download als Datei" }));
        await user.click(screen.getByRole("button", { name: "Löschen" }));

        expect(onConvert).toHaveBeenCalledOnce();
        expect(onCopy).toHaveBeenCalledOnce();
        expect(onDownload).toHaveBeenCalledOnce();
        expect(onClear).toHaveBeenCalledOnce();
    });
});
