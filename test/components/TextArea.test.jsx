import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TextArea from "../../src/components/TextArea.jsx";

describe("TextArea", () => {
    it("calls onChange when editable", async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();

        render(
            <TextArea
                rows={4}
                placeholder="Input"
                value=""
                onChange={onChange}
            />
        );

        await user.type(screen.getByPlaceholderText("Input"), "a");
        expect(onChange).toHaveBeenCalled();
    });

    it("renders read-only output", () => {
        render(
            <TextArea rows={4} value="output" readOnly onChange={() => {}} />
        );

        expect(screen.getByDisplayValue("output")).toHaveAttribute("readonly");
    });
});
