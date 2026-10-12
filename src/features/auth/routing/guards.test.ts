import { isRedirect } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";
import {
	hasAnyRole,
	hasRole,
	requireAuth,
	requireGuest,
	requireRole,
	sanitizeRedirect,
} from "./guards";

describe("sanitizeRedirect", () => {
	it("returns fallback when input is not a valid relative path", () => {
		expect(sanitizeRedirect(null)).toBe("/");
		expect(sanitizeRedirect(undefined)).toBe("/");
		expect(sanitizeRedirect("")).toBe("/");
		expect(sanitizeRedirect("   ")).toBe("/");
		expect(sanitizeRedirect("dashboard")).toBe("/");
		expect(sanitizeRedirect("https://example.com")).toBe("/");
		expect(sanitizeRedirect("//example.com")).toBe("/");
		expect(sanitizeRedirect("/\\example.com")).toBe("/");
	});

	it("returns fallback for auth loop destinations", () => {
		expect(sanitizeRedirect("/login")).toBe("/");
		expect(sanitizeRedirect("/register")).toBe("/");
		expect(sanitizeRedirect("/login?from=/dashboard")).toBe("/");
		expect(sanitizeRedirect("/register#terms")).toBe("/");
	});

	it("preserves valid application relative paths", () => {
		expect(sanitizeRedirect("/dashboard")).toBe("/dashboard");
		expect(sanitizeRedirect("/courses/101?tab=syllabus#week-1")).toBe(
			"/courses/101?tab=syllabus#week-1",
		);
	});

	it("respects custom fallback argument", () => {
		expect(sanitizeRedirect("invalid-url", "/catalog")).toBe("/catalog");
		expect(sanitizeRedirect(null, "/catalog")).toBe("/catalog");
	});
});

describe("role predicate helpers", () => {
	const studentUser = {
		id: "usr_1",
		email: "student@example.com",
		name: "Student One",
		role: "student" as const,
	};

	it("evaluates hasRole correctly", () => {
		expect(hasRole(studentUser, "student")).toBe(true);
		expect(hasRole(studentUser, "lecturer")).toBe(false);
		expect(hasRole(null, "student")).toBe(false);
		expect(hasRole(undefined, "student")).toBe(false);
	});

	it("evaluates hasAnyRole correctly", () => {
		expect(hasAnyRole(studentUser, ["student", "admin"])).toBe(true);
		expect(hasAnyRole(studentUser, ["lecturer", "admin"])).toBe(false);
		expect(hasAnyRole(null, ["student"])).toBe(false);
		expect(hasAnyRole(undefined, ["student"])).toBe(false);
	});
});

describe("requireAuth guard", () => {
	const user = {
		id: "usr_2",
		email: "alex@example.com",
		name: "Alex",
		role: "student" as const,
	};

	it("returns user when session is authenticated", () => {
		const result = requireAuth({
			context: {
				auth: {
					isAuthenticated: true,
					isLoading: false,
					user,
				},
			},
			location: { href: "/dashboard" },
		});

		expect(result).toEqual({ user });
	});

	it("redirects unauthenticated visitor to login with redirect param", () => {
		try {
			requireAuth({
				context: {
					auth: {
						isAuthenticated: false,
						isLoading: false,
						user: null,
					},
				},
				location: { href: "/dashboard?tab=overview" },
			});
			expect.unreachable("expected requireAuth to throw redirect");
		} catch (error) {
			expect(isRedirect(error)).toBe(true);
			if (isRedirect(error)) {
				expect(error.options.to).toBe("/login");
				expect(error.options.search).toEqual({
					redirect: "/dashboard?tab=overview",
				});
			}
		}
	});

	it("sanitizes unsafe location before setting redirect param", () => {
		try {
			requireAuth({
				context: {
					auth: {
						isAuthenticated: false,
						isLoading: false,
						user: null,
					},
				},
				location: { href: "https://attacker.com" },
			});
			expect.unreachable("expected requireAuth to throw redirect");
		} catch (error) {
			expect(isRedirect(error)).toBe(true);
			if (isRedirect(error)) {
				expect(error.options.search).toEqual({ redirect: "/" });
			}
		}
	});
});

describe("requireGuest guard", () => {
	const user = {
		id: "usr_3",
		email: "guest-test@example.com",
		name: "Guest Tester",
		role: "student" as const,
	};

	it("allows unauthenticated visitor without throwing", () => {
		expect(() =>
			requireGuest({
				context: {
					auth: {
						isAuthenticated: false,
						isLoading: false,
						user: null,
					},
				},
			}),
		).not.toThrow();
	});

	it("redirects authenticated user to home by default", () => {
		try {
			requireGuest({
				context: {
					auth: {
						isAuthenticated: true,
						isLoading: false,
						user,
					},
				},
			});
			expect.unreachable("expected requireGuest to throw redirect");
		} catch (error) {
			expect(isRedirect(error)).toBe(true);
			if (isRedirect(error)) {
				expect(error.options.to).toBe("/");
			}
		}
	});

	it("redirects authenticated user to sanitized target if redirect param is valid", () => {
		try {
			requireGuest({
				context: {
					auth: {
						isAuthenticated: true,
						isLoading: false,
						user,
					},
				},
				search: { redirect: "/dashboard" },
			});
			expect.unreachable("expected requireGuest to throw redirect");
		} catch (error) {
			expect(isRedirect(error)).toBe(true);
			if (isRedirect(error)) {
				expect(error.options.to).toBe("/dashboard");
			}
		}
	});

	it("falls back to home when redirect search param points back to auth route", () => {
		try {
			requireGuest({
				context: {
					auth: {
						isAuthenticated: true,
						isLoading: false,
						user,
					},
				},
				search: { redirect: "/login" },
			});
			expect.unreachable("expected requireGuest to throw redirect");
		} catch (error) {
			expect(isRedirect(error)).toBe(true);
			if (isRedirect(error)) {
				expect(error.options.to).toBe("/");
			}
		}
	});
});

describe("requireRole guard", () => {
	const studentUser = {
		id: "usr_4",
		email: "student@example.com",
		name: "Student",
		role: "student" as const,
	};

	const lecturerUser = {
		id: "usr_5",
		email: "lecturer@example.com",
		name: "Lecturer",
		role: "lecturer" as const,
	};

	it("redirects unauthenticated visitor to login first", () => {
		const guard = requireRole("lecturer");
		try {
			guard({
				context: {
					auth: {
						isAuthenticated: false,
						isLoading: false,
						user: null,
					},
				},
				location: { href: "/courses/create" },
			});
			expect.unreachable("expected requireRole to throw redirect");
		} catch (error) {
			expect(isRedirect(error)).toBe(true);
			if (isRedirect(error)) {
				expect(error.options.to).toBe("/login");
			}
		}
	});

	it("allows user matching required single role", () => {
		const guard = requireRole("student");
		const result = guard({
			context: {
				auth: {
					isAuthenticated: true,
					isLoading: false,
					user: studentUser,
				},
			},
			location: { href: "/dashboard" },
		});

		expect(result).toEqual({ user: studentUser });
	});

	it("allows user matching one of multiple allowed roles", () => {
		const guard = requireRole(["lecturer", "admin"]);
		const result = guard({
			context: {
				auth: {
					isAuthenticated: true,
					isLoading: false,
					user: lecturerUser,
				},
			},
			location: { href: "/courses/create" },
		});

		expect(result).toEqual({ user: lecturerUser });
	});

	it("redirects authenticated user lacking role to fallback", () => {
		const guard = requireRole("admin", "/catalog");
		try {
			guard({
				context: {
					auth: {
						isAuthenticated: true,
						isLoading: false,
						user: studentUser,
					},
				},
				location: { href: "/admin/settings" },
			});
			expect.unreachable("expected requireRole to throw redirect");
		} catch (error) {
			expect(isRedirect(error)).toBe(true);
			if (isRedirect(error)) {
				expect(error.options.to).toBe("/catalog");
			}
		}
	});
});
