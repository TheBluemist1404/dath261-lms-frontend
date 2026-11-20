import { isRedirect } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";
import { createTestQueryClient } from "@/test/render";
import { Route } from "./~dashboard";

const makeContext = (role?: "student" | "lecturer" | "admin") => ({
	queryClient: createTestQueryClient(),
	auth: {
		user: role ? { id: "u-1", email: "u@t.com", name: "User", role } : null,
		isAuthenticated: Boolean(role),
		isLoading: false,
	},
});

type RouteBeforeLoad = (opts: {
	context: ReturnType<typeof makeContext>;
	location: { href: string };
}) => unknown;

const beforeLoad = Route.options.beforeLoad as RouteBeforeLoad;

const callBeforeLoad = (role?: "student" | "lecturer" | "admin") =>
	beforeLoad({
		context: makeContext(role),
		location: { href: "/dashboard" },
	});

describe("Student Dashboard Route Guard", () => {
	it("permits authenticated student to load route", () => {
		expect(() => callBeforeLoad("student")).not.toThrow();
	});

	it("redirects unauthenticated visitor to login with return path", () => {
		try {
			callBeforeLoad();
			expect.fail("Expected redirect");
		} catch (error: unknown) {
			expect(isRedirect(error)).toBe(true);
			if (isRedirect(error)) {
				expect(error.options.to).toBe("/login");
				expect(error.options.search).toEqual({ redirect: "/dashboard" });
			}
		}
	});

	it.each([
		"lecturer",
		"admin",
	] as const)("redirects %s away from student route", (role) => {
		try {
			callBeforeLoad(role);
			expect.fail("Expected redirect");
		} catch (error: unknown) {
			expect(isRedirect(error)).toBe(true);
			if (isRedirect(error)) {
				expect(error.options.to).toBe("/");
			}
		}
	});
});
