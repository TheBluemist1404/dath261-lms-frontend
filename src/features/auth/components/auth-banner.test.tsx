import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AuthBanner } from "./auth-banner";

describe("AuthBanner", () => {
	it("renders error variant with role alert", () => {
		render(
			<AuthBanner
				variant="error"
				title="Error Occurred"
				message="Invalid credentials"
			/>,
		);

		const alert = screen.getByRole("alert");
		expect(alert).toBeInTheDocument();
		expect(alert).toHaveAttribute("aria-live", "assertive");
		expect(screen.getByText("Error Occurred")).toBeInTheDocument();
		expect(screen.getByText("Invalid credentials")).toBeInTheDocument();
	});

	it("renders success variant with role status", () => {
		render(
			<AuthBanner variant="success" message="Account created successfully." />,
		);

		const status = screen.getByRole("status");
		expect(status).toBeInTheDocument();
		expect(status).toHaveAttribute("aria-live", "polite");
		expect(
			screen.getByText("Account created successfully."),
		).toBeInTheDocument();
	});

	it("renders action button and triggers close callback", async () => {
		const user = userEvent.setup();
		const handleClose = vi.fn();

		render(
			<AuthBanner
				variant="warning"
				message="Session warning"
				action={<button type="button">Action Button</button>}
				onClose={handleClose}
			/>,
		);

		expect(
			screen.getByRole("button", { name: "Action Button" }),
		).toBeInTheDocument();

		const dismissBtn = screen.getByRole("button", { name: "Dismiss banner" });
		await user.click(dismissBtn);
		expect(handleClose).toHaveBeenCalledTimes(1);
	});
});
