import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { Button } from "./button";
import { Dialog } from "./dialog";

function Harness() {
	const [open, setOpen] = useState(false);
	return (
		<>
			<Button onClick={() => setOpen(true)}>Open</Button>
			<Dialog
				open={open}
				onClose={() => setOpen(false)}
				title="Rename page"
				description="Pick a short title."
			>
				<Button variant="secondary" onClick={() => setOpen(false)}>
					Cancel
				</Button>
			</Dialog>
		</>
	);
}

describe("Dialog", () => {
	it("opens as a labelled modal and closes from its own controls", async () => {
		const user = userEvent.setup();
		render(<Harness />);
		expect(screen.queryByRole("dialog")).toBeNull();

		await user.click(screen.getByRole("button", { name: "Open" }));
		const dialog = screen.getByRole("dialog", { name: "Rename page" });
		expect(dialog).toHaveAccessibleDescription("Pick a short title.");

		await user.click(screen.getByRole("button", { name: "Cancel" }));
		expect(screen.queryByRole("dialog")).toBeNull();
	});
});
