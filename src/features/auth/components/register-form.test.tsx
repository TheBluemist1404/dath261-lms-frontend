import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/stores/auth.store";
import { server } from "@/test/mocks/server";
import { RegisterForm } from "./register-form";

const mockNavigate = vi.fn();

vi.mock("@tanstack/react-router", async (importOriginal) => {
	const actual =
		await importOriginal<typeof import("@tanstack/react-router")>();
	return {
		...actual,
		useNavigate: () => mockNavigate,
		Link: ({
			children,
			to,
			...props
		}: {
			children: React.ReactNode;
			to: string;
		}) => (
			<a href={to} {...props}>
				{children}
			</a>
		),
	};
});

describe("RegisterForm", () => {
	beforeEach(() => {
		mockNavigate.mockClear();
		useAuthStore.getState().reset();
	});

	afterEach(() => {
		useAuthStore.getState().reset();
	});

	it("shows mononym validation error when single word is entered for full name", async () => {
		const user = userEvent.setup();
		render(<RegisterForm />);

		await user.type(screen.getByLabelText(/full name/i), "Plato");
		await user.type(screen.getByLabelText(/email/i), "plato@example.com");
		await user.type(screen.getByLabelText(/^password/i), "securepassword123");

		await user.click(screen.getByRole("button", { name: "Create account" }));

		expect(
			screen.getByText(
				"Please enter your full name (both first and last name).",
			),
		).toBeInTheDocument();
		expect(mockNavigate).not.toHaveBeenCalled();
	});

	it("shows validation error when password is less than 8 characters", async () => {
		const user = userEvent.setup();
		render(<RegisterForm />);

		await user.type(screen.getByLabelText(/full name/i), "Alex Le");
		await user.type(screen.getByLabelText(/email/i), "alex@example.com");
		await user.type(screen.getByLabelText(/^password/i), "short");

		await user.click(screen.getByRole("button", { name: "Create account" }));

		expect(
			screen.getByText("Password must be at least 8 characters."),
		).toBeInTheDocument();
		expect(mockNavigate).not.toHaveBeenCalled();
	});

	it("shows validation error when password exceeds 72 characters", async () => {
		const user = userEvent.setup();
		render(<RegisterForm />);

		const longPassword = "a".repeat(73);
		await user.type(screen.getByLabelText(/full name/i), "Alex Le");
		await user.type(screen.getByLabelText(/email/i), "alex@example.com");
		await user.type(screen.getByLabelText(/^password/i), longPassword);

		await user.click(screen.getByRole("button", { name: "Create account" }));

		expect(
			screen.getByText("Password cannot exceed 72 characters."),
		).toBeInTheDocument();
		expect(mockNavigate).not.toHaveBeenCalled();
	});

	it("toggles password visibility with proper aria attributes", async () => {
		const user = userEvent.setup();
		render(<RegisterForm />);

		const passwordInput = screen.getByLabelText(/^password/i);
		const toggleButton = screen.getByRole("button", { name: "Show password" });

		expect(passwordInput).toHaveAttribute("type", "password");
		expect(toggleButton).toHaveAttribute("aria-pressed", "false");

		await user.click(toggleButton);

		expect(passwordInput).toHaveAttribute("type", "text");
		expect(
			screen.getByRole("button", { name: "Hide password" }),
		).toHaveAttribute("aria-pressed", "true");

		await user.click(screen.getByRole("button", { name: "Hide password" }));

		expect(passwordInput).toHaveAttribute("type", "password");
		expect(
			screen.getByRole("button", { name: "Show password" }),
		).toHaveAttribute("aria-pressed", "false");
	});

	it("displays NestJS array validation errors in AuthBanner", async () => {
		server.use(
			http.post("/api/auth/register", () => {
				return HttpResponse.json(
					{
						message: [
							"password must be longer than or equal to 8 characters",
							"email must be an email",
						],
					},
					{ status: 400 },
				);
			}),
		);

		const user = userEvent.setup();
		render(<RegisterForm />);

		await user.type(screen.getByLabelText(/full name/i), "Alex Le");
		await user.type(screen.getByLabelText(/email/i), "alex@example.com");
		await user.type(screen.getByLabelText(/^password/i), "validpassword123");

		await user.click(screen.getByRole("button", { name: "Create account" }));

		const banner = await screen.findByRole("alert");
		expect(banner).toHaveTextContent(
			"password must be longer than or equal to 8 characters. email must be an email",
		);
	});

	it("displays conflict error banner when email already exists (HTTP 409)", async () => {
		const user = userEvent.setup();
		render(<RegisterForm />);

		await user.type(screen.getByLabelText(/full name/i), "Alex Le");
		await user.type(screen.getByLabelText(/email/i), "exists@example.com");
		await user.type(screen.getByLabelText(/^password/i), "password123");

		await user.click(screen.getByRole("button", { name: "Create account" }));

		const banner = await screen.findByRole("alert");
		expect(banner).toHaveTextContent(
			"An account with this email already exists.",
		);
		expect(mockNavigate).not.toHaveBeenCalled();
	});

	it("redirects to /login with email and registered=true query params on success without logging in", async () => {
		const user = userEvent.setup();
		render(<RegisterForm />);

		await user.type(screen.getByLabelText(/full name/i), "Alex Le");
		await user.type(screen.getByLabelText(/email/i), "newuser@example.com");
		await user.type(screen.getByLabelText(/^password/i), "password123");

		await user.click(screen.getByRole("button", { name: "Create account" }));

		await screen.findByRole("button", { name: "Create account" });

		expect(mockNavigate).toHaveBeenCalledWith({
			to: "/login",
			search: {
				email: "newuser@example.com",
				registered: true,
			},
		});

		// Verify user store remains unauthenticated (no zombie session!)
		expect(useAuthStore.getState().status).not.toBe("authenticated");
		expect(useAuthStore.getState().user).toBeNull();
	});
});
