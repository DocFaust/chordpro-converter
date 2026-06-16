import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, within, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NextcloudUploadModal from "../../src/components/NextcloudUploadModal.jsx";

vi.mock("../../src/nextcloud/client.js", () => ({
    uploadFile: vi.fn(),
}));

import { uploadFile } from "../../src/nextcloud/client.js";

const settings = {
    baseUrl: "https://cloud.example.com",
    username: "user",
    password: "pass",
    folderPath: "Band/ChordPro",
};

describe("NextcloudUploadModal", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        cleanup();
    });

    it("shows file name and target folder", () => {
        render(
            <NextcloudUploadModal
                show={true}
                onHide={vi.fn()}
                settings={settings}
                fileName="MySong.chord"
                content="{title: MySong}"
            />
        );

        const dialog = screen.getByRole("dialog");
        expect(within(dialog).getByText("MySong.chord")).toBeInTheDocument();
        expect(within(dialog).getByText("Band/ChordPro")).toBeInTheDocument();
    });

    it("calls uploadFile on confirm", async () => {
        uploadFile.mockResolvedValue(undefined);
        const user = userEvent.setup();
        const onHide = vi.fn();

        render(
            <NextcloudUploadModal
                show={true}
                onHide={onHide}
                settings={settings}
                fileName="MySong.chord"
                content="{title: MySong}"
            />
        );

        const dialog = screen.getByRole("dialog");
        await user.click(within(dialog).getByRole("button", { name: "Hochladen" }));

        await waitFor(() => {
            expect(uploadFile).toHaveBeenCalledWith(
                settings,
                "Band/ChordPro",
                "MySong.chord",
                "{title: MySong}"
            );
        });
    });

    it("shows error on failed upload", async () => {
        uploadFile.mockRejectedValue(new Error("Upload fehlgeschlagen"));
        const user = userEvent.setup();

        render(
            <NextcloudUploadModal
                show={true}
                onHide={vi.fn()}
                settings={settings}
                fileName="MySong.chord"
                content="content"
            />
        );

        const dialog = screen.getByRole("dialog");
        await user.click(within(dialog).getByRole("button", { name: "Hochladen" }));

        await waitFor(() => {
            expect(within(dialog).getByText("Upload fehlgeschlagen")).toBeInTheDocument();
        });
    });
});
