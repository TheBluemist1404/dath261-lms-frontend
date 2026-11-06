import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/stores/auth.store";
import { LoginForm } from "./login-form";

const mockNavigate = vi.fn();
let mockSearchValue: Record<string, unknown> = {};

vi.mock("@tanstack/react-router", async (importOriginal) => {
	const actual =
		await importOriginal<typeof import("@tanstack/react-router")>();
	return {
		...actual,
		useNavigate: () => mockNavigate,
		useSearch: () => mockSearchValue,
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

describe("LoginForm", () => {
	beforeEach(() => {
		mockNavigate.mockClear();
		mockSearchValue = {};
		useAuthStore.getState().reset();
	});

	afterEach(() => {
		useAuthStore.getState().reset();
	});

	it("pre-fills email and displays registration success banner when registered=true", () => {
		render(<LoginForm initialEmail="newuser@example.com" registered={true} />);

		const emailInput = screen.getByLabelText(/email/i);
		expect(emailInput).toHaveValue("newuser@example.com");

		const successBanner = screen.getByRole("status");
		expect(successBanner).toHaveTextContent(
			"Account created successfully. Please log in.",
		);
	});

	it("displays invalid credentials error banner on HTTP 401", async () => {
		const user = userEvent.setup();
		render(<LoginForm />);

		await user.type(screen.getByLabelText(/email/i), "invalid@example.com");
		await user.type(screen.getByLabelText(/^password/i), "wrong-password");

		await user.click(screen.getByRole("button", { name: "Log in" }));

		const errorBanner = await screen.findByRole("alert");
		expect(errorBanner).toHaveTextContent("Invalid email or password.");
		expect(mockNavigate).not.toHaveBeenCalled();
		expect(useAuthStore.getState().status).not.toBe("authenticated");
		expect(useAuthStore.getState().user).toBeNull();
	});

	it("displays suspended account banner and return to catalog button on HTTP 403", async () => {
		const user = userEvent.setup();
		render(<LoginForm />);

		await user.type(screen.getByLabelText(/email/i), "suspended@nodus.edu");
		await user.type(screen.getByLabelText(/^password/i), "password123");

		await user.click(screen.getByRole("button", { name: "Log in" }));

		const suspendedHeading = await screen.findByText("Account Suspended");
		expect(suspendedHeading).toBeInTheDocument();
		expect(
			screen.getByText("Your account has been suspended by an administrator."),
		).toBeInTheDocument();

		const catalogLink = screen.getByRole("link", {
			name: "Return to catalog",
		});
		expect(catalogLink).toBeInTheDocument();
		expect(catalogLink).toHaveAttribute("href", "/");
	});

	it("redirects to sanitized destination upon successful login", async () => {
		const user = userEvent.setup();
		render(<LoginForm redirect="/workspace/personal" />);

		await user.type(screen.getByLabelText(/email/i), "student@nodus.edu");
		await user.type(screen.getByLabelText(/^password/i), "validpassword123");

		await user.click(screen.getByRole("button", { name: "Log in" }));

		await screen.findByRole("button", { name: "Log in" });

		expect(mockNavigate).toHaveBeenCalledWith({
			to: "/workspace/personal",
		});
		expect(useAuthStore.getState().status).toBe("authenticated");
	});

	it("sanitizes malicious open redirect to safe fallback /workspace", async () => {
		const user = userEvent.setup();
		render(<LoginForm redirect="//evil.com/phishing" />);

		await user.type(screen.getByLabelText(/email/i), "student@nodus.edu");
		await user.type(screen.getByLabelText(/^password/i), "validpassword123");

		await user.click(screen.getByRole("button", { name: "Log in" }));

		await screen.findByRole("button", { name: "Log in" });

		expect(mockNavigate).toHaveBeenCalledWith({
			to: "/workspace",
		});
		expect(useAuthStore.getState().status).toBe("authenticated");
	});
});
