import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import InputFields from "../../src/components/InputFields.jsx";

describe("InputFields", () => {
    it("renders metadata fields and forwards changes", async () => {
        const user = userEvent.setup();
        const setTitle = vi.fn();
        const setArtist = vi.fn();
        const setCapo = vi.fn();
        const setKey = vi.fn();

        render(
            <InputFields
                title=""
                setTitle={setTitle}
                artist=""
                setArtist={setArtist}
                capo=""
                setCapo={setCapo}
                keyValue=""
                setKey={setKey}
            />
        );

        await user.type(screen.getByLabelText("Titel"), "Song");
        await user.type(screen.getByLabelText("Interpret"), "Artist");
        await user.type(screen.getByLabelText("Capo"), "3");
        await user.type(screen.getByLabelText("Tonart"), "E");

        expect(setTitle).toHaveBeenCalled();
        expect(setArtist).toHaveBeenCalled();
        expect(setCapo).toHaveBeenCalled();
        expect(setKey).toHaveBeenCalled();
    });
});
