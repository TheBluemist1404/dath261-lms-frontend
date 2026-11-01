import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sanitizeRedirect } from "@/features/auth/routing/guards";
import {
	NameValidationError,
	partitionFullName,
} from "@/features/auth/utils/name-partitioner";
import { getAccessToken, setAccessToken } from "@/lib/auth/access-token";
import { useAuthStore } from "@/stores/auth.store";
import { server } from "@/test/mocks/server";
import { LoginForm } from "./login-form";
import { RegisterForm } from "./register-form";
import { RoleToggle } from "./role-toggle";

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

describe("PR #15 EMPIRICAL ADVERSARIAL CHALLENGE SUITE", () => {
	beforeEach(() => {
		mockNavigate.mockClear();
		mockSearchValue = {};
		setAccessToken(null);
		useAuthStore.getState().clearAuth();
		localStorage.clear();
	});

	afterEach(() => {
		mockNavigate.mockClear();
		mockSearchValue = {};
		setAccessToken(null);
		useAuthStore.getState().clearAuth();
		localStorage.clear();
	});

	// =========================================================================
	// 1. REGISTRATION MONONYM DEFENSE & PARTITIONING BOUNDARIES
	// =========================================================================
	describe("1. Registration Mononym Defense & Name Partitioning Boundaries", () => {
		const mononyms = [
			"Cher",
			"Madonna",
			"   Plato   ",
			"Socrates",
			"Zendaya",
			"SingleWordName",
			"Aristotle\t",
			"\nVoltaire\n",
		];

		for (const name of mononyms) {
			it(`rejects mononym "${name.trim()}" at form level with error message`, async () => {
				const user = userEvent.setup();
				render(<RegisterForm />);

				await user.type(screen.getByLabelText(/full name/i), name);
				await user.type(screen.getByLabelText(/email/i), "user@example.com");
				await user.type(
					screen.getByLabelText(/^password/i),
					"validpassword123",
				);

				await user.click(
					screen.getByRole("button", { name: "Create account" }),
				);

				expect(
					screen.getByText(
						"Please enter your full name (both first and last name).",
					),
				).toBeInTheDocument();
				expect(mockNavigate).not.toHaveBeenCalled();
			});
		}

		it("rejects empty name or whitespace-only names with explicit validation error", async () => {
			const user = userEvent.setup();
			render(<RegisterForm />);

			await user.type(screen.getByLabelText(/full name/i), "     ");
			await user.type(screen.getByLabelText(/email/i), "user@example.com");
			await user.type(screen.getByLabelText(/^password/i), "validpassword123");

			await user.click(screen.getByRole("button", { name: "Create account" }));

			expect(
				screen.getByText("Full name cannot be empty."),
			).toBeInTheDocument();
			expect(mockNavigate).not.toHaveBeenCalled();
		});

		it("correctly partitions multi-space and multi-token names on first space", () => {
			const result1 = partitionFullName("Alex   Van   Halen");
			expect(result1).toEqual({
				firstName: "Alex",
				lastName: "Van Halen",
			});

			const result2 = partitionFullName("   Marie   Skłodowska   Curie   ");
			expect(result2).toEqual({
				firstName: "Marie",
				lastName: "Skłodowska Curie",
			});

			const result3 = partitionFullName("Nguyen Van An");
			expect(result3).toEqual({
				firstName: "Nguyen",
				lastName: "Van An",
			});

			const result4 = partitionFullName("A B");
			expect(result4).toEqual({
				firstName: "A",
				lastName: "B",
			});
		});

		it("enforces 100 character boundary per name partition", () => {
			// Exactly 100 chars for both parts: valid
			const first100 = "A".repeat(100);
			const last100 = "B".repeat(100);
			const validPartition = partitionFullName(`${first100} ${last100}`);
			expect(validPartition.firstName).toBe(first100);
			expect(validPartition.lastName).toBe(last100);

			// 101 chars for firstName: fails
			const first101 = "A".repeat(101);
			expect(() => partitionFullName(`${first101} Doe`)).toThrow(
				new NameValidationError(
					"First name exceeds maximum length of 100 characters.",
				),
			);

			// 101 chars for lastName: fails
			const last101 = "B".repeat(101);
			expect(() => partitionFullName(`John ${last101}`)).toThrow(
				new NameValidationError(
					"Last name exceeds maximum length of 100 characters.",
				),
			);
		});

		it("surfaces partition length errors in RegisterForm UI", async () => {
			const user = userEvent.setup();
			render(<RegisterForm />);

			const longFirst = "A".repeat(101);
			await user.type(screen.getByLabelText(/full name/i), `${longFirst} Doe`);
			await user.type(screen.getByLabelText(/email/i), "user@example.com");
			await user.type(screen.getByLabelText(/^password/i), "validpassword123");

			await user.click(screen.getByRole("button", { name: "Create account" }));

			expect(
				screen.getByText(
					"First name exceeds maximum length of 100 characters.",
				),
			).toBeInTheDocument();
			expect(mockNavigate).not.toHaveBeenCalled();
		});
	});

	// =========================================================================
	// 2. PASSWORD BOUNDARIES (8 TO 72 CHARACTERS)
	// =========================================================================
	describe("2. Password Length Boundaries (8 to 72 Characters)", () => {
		it("rejects password with 7 characters (boundary - 1)", async () => {
			const user = userEvent.setup();
			render(<RegisterForm />);

			await user.type(screen.getByLabelText(/full name/i), "Alex Le");
			await user.type(screen.getByLabelText(/email/i), "alex@example.com");
			await user.type(screen.getByLabelText(/^password/i), "1234567");

			await user.click(screen.getByRole("button", { name: "Create account" }));

			expect(
				screen.getByText("Password must be at least 8 characters."),
			).toBeInTheDocument();
			expect(mockNavigate).not.toHaveBeenCalled();
		});

		it("accepts password with exactly 8 characters (lower boundary)", async () => {
			const user = userEvent.setup();
			render(<RegisterForm />);

			await user.type(screen.getByLabelText(/full name/i), "Alex Le");
			await user.type(screen.getByLabelText(/email/i), "alex8@example.com");
			await user.type(screen.getByLabelText(/^password/i), "12345678");

			await user.click(screen.getByRole("button", { name: "Create account" }));

			await waitFor(() => {
				expect(mockNavigate).toHaveBeenCalledWith({
					to: "/login",
					search: {
						email: "alex8@example.com",
						registered: true,
					},
				});
			});
		});

		it("accepts password with exactly 72 characters (upper boundary)", async () => {
			const user = userEvent.setup();
			render(<RegisterForm />);

			const password72 = "p".repeat(72);
			await user.type(screen.getByLabelText(/full name/i), "Alex Le");
			await user.type(screen.getByLabelText(/email/i), "alex72@example.com");
			await user.type(screen.getByLabelText(/^password/i), password72);

			await user.click(screen.getByRole("button", { name: "Create account" }));

			await waitFor(() => {
				expect(mockNavigate).toHaveBeenCalledWith({
					to: "/login",
					search: {
						email: "alex72@example.com",
						registered: true,
					},
				});
			});
		});

		it("rejects password with 73 characters (upper boundary + 1)", async () => {
			const user = userEvent.setup();
			render(<RegisterForm />);

			const password73 = "p".repeat(73);
			await user.type(screen.getByLabelText(/full name/i), "Alex Le");
			await user.type(screen.getByLabelText(/email/i), "alex73@example.com");
			await user.type(screen.getByLabelText(/^password/i), password73);

			await user.click(screen.getByRole("button", { name: "Create account" }));

			expect(
				screen.getByText("Password cannot exceed 72 characters."),
			).toBeInTheDocument();
			expect(mockNavigate).not.toHaveBeenCalled();
		});

		it("rejects empty password with required message", async () => {
			const user = userEvent.setup();
			render(<RegisterForm />);

			await user.type(screen.getByLabelText(/full name/i), "Alex Le");
			await user.type(screen.getByLabelText(/email/i), "alex@example.com");

			await user.click(screen.getByRole("button", { name: "Create account" }));

			expect(screen.getByText("Password is required.")).toBeInTheDocument();
			expect(mockNavigate).not.toHaveBeenCalled();
		});
	});

	// =========================================================================
	// 3. NON-MUTATION OF AUTH STORE ON 201 REGISTRATION
	// =========================================================================
	describe("3. Non-Mutation of Auth Store on 201 Registration (Zombie Session Elimination)", () => {
		it("strictly prevents mutation of useAuthStore and in-memory access token upon 201 Created", async () => {
			expect(useAuthStore.getState().status).toBe("unauthenticated");
			expect(useAuthStore.getState().user).toBeNull();
			expect(getAccessToken()).toBeNull();

			const user = userEvent.setup();
			render(<RegisterForm />);

			await user.type(screen.getByLabelText(/full name/i), "Marie Curie");
			await user.type(screen.getByLabelText(/email/i), "marie.curie@nodus.edu");
			await user.type(screen.getByLabelText(/^password/i), "NobelPrize1903!");

			await user.click(screen.getByRole("button", { name: "Create account" }));

			await waitFor(() => {
				expect(mockNavigate).toHaveBeenCalledWith({
					to: "/login",
					search: {
						email: "marie.curie@nodus.edu",
						registered: true,
					},
				});
			});

			// EMPIRICAL ASSERTIONS: Store remains completely unauthenticated
			expect(useAuthStore.getState().status).toBe("unauthenticated");
			expect(useAuthStore.getState().user).toBeNull();
			expect(getAccessToken()).toBeNull();
		});

		it("does not mutate auth store even if server maliciously returns accessToken in 201 body", async () => {
			server.use(
				http.post("/api/auth/register", () => {
					return HttpResponse.json(
						{
							user: { id: "evil-user", email: "evil@example.com" },
							accessToken: "malicious-injected-token",
						},
						{ status: 201 },
					);
				}),
			);

			const user = userEvent.setup();
			render(<RegisterForm />);

			await user.type(screen.getByLabelText(/full name/i), "Jane Doe");
			await user.type(screen.getByLabelText(/email/i), "jane@example.com");
			await user.type(screen.getByLabelText(/^password/i), "password123");

			await user.click(screen.getByRole("button", { name: "Create account" }));

			await waitFor(() => {
				expect(mockNavigate).toHaveBeenCalledWith({
					to: "/login",
					search: {
						email: "jane@example.com",
						registered: true,
					},
				});
			});

			expect(useAuthStore.getState().status).toBe("unauthenticated");
			expect(useAuthStore.getState().user).toBeNull();
			expect(getAccessToken()).toBeNull();
		});
	});

	// =========================================================================
	// 4. HTTP 401 AND 403 ERROR STATES
	// =========================================================================
	describe("4. Login Error States (HTTP 401 & 403)", () => {
		it("displays generic 'Invalid email or password.' banner on HTTP 401 and does not navigate", async () => {
			const user = userEvent.setup();
			render(<LoginForm />);

			await user.type(screen.getByLabelText(/email/i), "invalid@example.com");
			await user.type(screen.getByLabelText(/^password/i), "wrong-password");

			await user.click(screen.getByRole("button", { name: "Log in" }));

			const errorAlert = await screen.findByRole("alert");
			expect(errorAlert).toHaveTextContent("Invalid email or password.");
			expect(mockNavigate).not.toHaveBeenCalled();
			expect(useAuthStore.getState().status).toBe("unauthenticated");
			expect(useAuthStore.getState().user).toBeNull();
			expect(getAccessToken()).toBeNull();
		});

		it("displays dedicated suspended account card with catalog button on HTTP 403", async () => {
			const user = userEvent.setup();
			render(<LoginForm />);

			await user.type(screen.getByLabelText(/email/i), "suspended@nodus.edu");
			await user.type(screen.getByLabelText(/^password/i), "anypassword123");

			await user.click(screen.getByRole("button", { name: "Log in" }));

			// Check suspended card elements
			expect(await screen.findByText("Account Suspended")).toBeInTheDocument();
			expect(
				screen.getByText(
					"Your account has been suspended by an administrator.",
				),
			).toBeInTheDocument();
			expect(
				screen.getByText(/reach out to your administrator/i),
			).toBeInTheDocument();

			const catalogLink = screen.getByRole("link", {
				name: "Return to catalog",
			});
			expect(catalogLink).toBeInTheDocument();
			expect(catalogLink).toHaveAttribute("href", "/");

			// Form fields must be removed/hidden to prevent re-submission
			expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument();
			expect(
				screen.queryByRole("button", { name: "Log in" }),
			).not.toBeInTheDocument();

			expect(useAuthStore.getState().status).toBe("unauthenticated");
			expect(useAuthStore.getState().user).toBeNull();
			expect(getAccessToken()).toBeNull();
		});

		it("displays connection error banner on HTTP 500 server crash", async () => {
			server.use(
				http.post("/api/auth/login", () => {
					return HttpResponse.json(
						{ message: "Internal Server Error" },
						{ status: 500 },
					);
				}),
			);

			const user = userEvent.setup();
			render(<LoginForm />);

			await user.type(screen.getByLabelText(/email/i), "user@example.com");
			await user.type(screen.getByLabelText(/^password/i), "password123");

			await user.click(screen.getByRole("button", { name: "Log in" }));

			const errorAlert = await screen.findByRole("alert");
			expect(errorAlert).toHaveTextContent(
				"Unable to connect to login service. Please try again later.",
			);
			expect(mockNavigate).not.toHaveBeenCalled();
			expect(useAuthStore.getState().status).toBe("unauthenticated");
		});
	});

	// =========================================================================
	// 5. OPEN REDIRECT DEFENSE & SANITIZATION
	// =========================================================================
	describe("5. Open Redirect Defense & Sanitization", () => {
		const maliciousVectors = [
			"//evil.com",
			"//evil.com/phishing",
			"///evil.com",
			"/\\evil.com",
			"\\evil.com",
			"http://attacker.com",
			"https://attacker.com/steal-session",
			"javascript:alert(1)",
			"data:text/html,<script>alert(1)</script>",
			"/%2f%2fevil.com",
			"/%252f%252fevil.com",
			"/login",
			"/login?redirect=/admin",
			"/register",
			"/register?source=invite",
			"/login#hash",
			"/register#tab",
		];

		for (const vector of maliciousVectors) {
			it(`sanitizes attack vector "${vector}" to fallback "/workspace"`, () => {
				const sanitized = sanitizeRedirect(vector, "/workspace");
				expect(sanitized).toBe("/workspace");
			});
		}

		it("preserves safe, valid relative redirect targets", () => {
			expect(sanitizeRedirect("/workspace", "/fallback")).toBe("/workspace");
			expect(sanitizeRedirect("/workspace/notes/123", "/fallback")).toBe(
				"/workspace/notes/123",
			);
			expect(sanitizeRedirect("/courses/cs101?view=grid", "/fallback")).toBe(
				"/courses/cs101?view=grid",
			);
			expect(sanitizeRedirect("/settings/profile", "/fallback")).toBe(
				"/settings/profile",
			);
		});

		it("LoginForm sanitizes open redirect query parameter upon successful authentication", async () => {
			const user = userEvent.setup();
			render(<LoginForm redirect="//malicious-site.com/steal-token" />);

			await user.type(screen.getByLabelText(/email/i), "student@nodus.edu");
			await user.type(screen.getByLabelText(/^password/i), "validpassword123");

			await user.click(screen.getByRole("button", { name: "Log in" }));

			await waitFor(() => {
				expect(mockNavigate).toHaveBeenCalledWith({
					to: "/workspace",
				});
			});
		});

		it("LoginForm honors legitimate deep-link redirect upon successful authentication", async () => {
			const user = userEvent.setup();
			render(<LoginForm redirect="/workspace/shared-notes/lec-1" />);

			await user.type(screen.getByLabelText(/email/i), "student@nodus.edu");
			await user.type(screen.getByLabelText(/^password/i), "validpassword123");

			await user.click(screen.getByRole("button", { name: "Log in" }));

			await waitFor(() => {
				expect(mockNavigate).toHaveBeenCalledWith({
					to: "/workspace/shared-notes/lec-1",
				});
			});
		});
	});

	// =========================================================================
	// 6. ROLE TOGGLE & ACCESSIBILITY HARNESS
	// =========================================================================
	describe("6. RoleToggle ARIA Keyboard Navigation & Robustness", () => {
		it("supports roving tabindex and arrow key navigation between STUDENT and LECTURER", async () => {
			const handleChange = vi.fn();
			const user = userEvent.setup();

			const { rerender } = render(
				<RoleToggle value="STUDENT" onChange={handleChange} />,
			);

			const studentTab = screen.getByRole("tab", { name: "Student" });
			const lecturerTab = screen.getByRole("tab", { name: "Lecturer" });

			expect(studentTab).toHaveAttribute("aria-selected", "true");
			expect(studentTab).toHaveAttribute("tabIndex", "0");
			expect(lecturerTab).toHaveAttribute("aria-selected", "false");
			expect(lecturerTab).toHaveAttribute("tabIndex", "-1");

			studentTab.focus();
			await user.keyboard("{ArrowRight}");

			expect(handleChange).toHaveBeenCalledWith("LECTURER");

			// Rerender as LECTURER
			rerender(<RoleToggle value="LECTURER" onChange={handleChange} />);
			expect(screen.getByRole("tab", { name: "Lecturer" })).toHaveAttribute(
				"aria-selected",
				"true",
			);
			expect(screen.getByRole("tab", { name: "Lecturer" })).toHaveAttribute(
				"tabIndex",
				"0",
			);
			expect(screen.getByRole("tab", { name: "Student" })).toHaveAttribute(
				"aria-selected",
				"false",
			);
			expect(screen.getByRole("tab", { name: "Student" })).toHaveAttribute(
				"tabIndex",
				"-1",
			);

			// Test Home and End keys
			await user.keyboard("{Home}");
			expect(handleChange).toHaveBeenCalledWith("STUDENT");

			await user.keyboard("{End}");
			expect(handleChange).toHaveBeenCalledWith("LECTURER");
		});

		it("normalizes lowercase role strings to uppercase enum ('student' -> 'STUDENT')", () => {
			const handleChange = vi.fn();
			render(
				<RoleToggle
					value={"student" as unknown as "STUDENT"}
					onChange={handleChange}
				/>,
			);

			const studentTab = screen.getByRole("tab", { name: "Student" });
			expect(studentTab).toHaveAttribute("aria-selected", "true");
		});
	});
});
