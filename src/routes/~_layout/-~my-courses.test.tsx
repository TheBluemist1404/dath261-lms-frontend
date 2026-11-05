import { isRedirect } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";
import { Route } from "./~my-courses";

const makeContext = (role?: "student" | "lecturer") => ({
	auth: {
		user: role ? { id: "u-1", email: "u@t.com", name: "User", role } : null,
		isAuthenticated: Boolean(role),
		isLoading: false,
	},
});

describe("My Courses Route Guard", () => {
	it("permits authenticated student to load route", () => {
		expect(() =>
			Route.options.beforeLoad?.({
				context: makeContext("student"),
				location: { href: "/my-courses" },
			} as never),
		).not.toThrow();
	});

	it("redirects unauthenticated visitor to login with return path", () => {
		try {
			Route.options.beforeLoad?.({
				context: makeContext(),
				location: { href: "/my-courses" },
			} as never);
			expect.fail("Expected redirect");
		} catch (error: unknown) {
			expect(isRedirect(error)).toBe(true);
			if (isRedirect(error)) {
				expect(error.options.to).toBe("/login");
				expect(error.options.search).toEqual({ redirect: "/my-courses" });
			}
		}
	});

	it("redirects lecturer and admin users away from student route", () => {
		try {
			Route.options.beforeLoad?.({
				context: makeContext("lecturer"),
				location: { href: "/my-courses" },
			} as never);
			expect.fail("Expected redirect");
		} catch (error: unknown) {
			expect(isRedirect(error)).toBe(true);
			if (isRedirect(error)) {
				expect(error.options.to).toBe("/");
			}
		}
	});
});
