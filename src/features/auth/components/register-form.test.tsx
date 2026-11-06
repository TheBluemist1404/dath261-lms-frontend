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

	it("shows validation error when first name is empty", async () => {
		const user = userEvent.setup();
		render(<RegisterForm />);

		await user.type(screen.getByLabelText(/last name/i), "Smith");
		await user.type(screen.getByLabelText(/email/i), "smith@example.com");
		await user.type(screen.getByLabelText(/^password/i), "securepassword123");

		await user.click(screen.getByRole("button", { name: "Create account" }));

		expect(screen.getByText("First name is required.")).toBeInTheDocument();
		expect(mockNavigate).not.toHaveBeenCalled();
	});

	it("shows validation error when last name is empty", async () => {
		const user = userEvent.setup();
		render(<RegisterForm />);

		await user.type(screen.getByLabelText(/first name/i), "John");
		await user.type(screen.getByLabelText(/email/i), "john@example.com");
		await user.type(screen.getByLabelText(/^password/i), "securepassword123");

		await user.click(screen.getByRole("button", { name: "Create account" }));

		expect(screen.getByText("Last name is required.")).toBeInTheDocument();
		expect(mockNavigate).not.toHaveBeenCalled();
	});

	it("shows validation error when first name exceeds 100 characters", async () => {
		const user = userEvent.setup();
		render(<RegisterForm />);

		await user.type(screen.getByLabelText(/first name/i), "a".repeat(101));
		await user.type(screen.getByLabelText(/last name/i), "Smith");
		await user.type(screen.getByLabelText(/email/i), "smith@example.com");
		await user.type(screen.getByLabelText(/^password/i), "securepassword123");

		await user.click(screen.getByRole("button", { name: "Create account" }));

		expect(
			screen.getByText("First name cannot exceed 100 characters."),
		).toBeInTheDocument();
		expect(mockNavigate).not.toHaveBeenCalled();
	});

	it("shows validation error when last name exceeds 100 characters", async () => {
		const user = userEvent.setup();
		render(<RegisterForm />);

		await user.type(screen.getByLabelText(/first name/i), "John");
		await user.type(screen.getByLabelText(/last name/i), "b".repeat(101));
		await user.type(screen.getByLabelText(/email/i), "john@example.com");
		await user.type(screen.getByLabelText(/^password/i), "securepassword123");

		await user.click(screen.getByRole("button", { name: "Create account" }));

		expect(
			screen.getByText("Last name cannot exceed 100 characters."),
		).toBeInTheDocument();
		expect(mockNavigate).not.toHaveBeenCalled();
	});

	it("shows validation error when password is less than 8 characters", async () => {
		const user = userEvent.setup();
		render(<RegisterForm />);

		await user.type(screen.getByLabelText(/first name/i), "Alex");
		await user.type(screen.getByLabelText(/last name/i), "Le");
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
		await user.type(screen.getByLabelText(/first name/i), "Alex");
		await user.type(screen.getByLabelText(/last name/i), "Le");
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

		await user.type(screen.getByLabelText(/first name/i), "Alex");
		await user.type(screen.getByLabelText(/last name/i), "Le");
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

		await user.type(screen.getByLabelText(/first name/i), "Alex");
		await user.type(screen.getByLabelText(/last name/i), "Le");
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

		await user.type(screen.getByLabelText(/first name/i), "Alex");
		await user.type(screen.getByLabelText(/last name/i), "Le");
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

		expect(useAuthStore.getState().status).not.toBe("authenticated");
		expect(useAuthStore.getState().user).toBeNull();
	});
});
