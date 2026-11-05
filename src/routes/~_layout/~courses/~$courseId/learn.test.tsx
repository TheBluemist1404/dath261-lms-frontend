import { isRedirect } from "@tanstack/react-router";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { setAccessToken } from "@/lib/auth/access-token";
import { installAuthInterceptors } from "@/lib/http/auth-interceptors";
import { createMockAccessToken } from "@/mocks/auth.handlers";
import { createTestQueryClient } from "@/test/render";
import { Route, validateLearnSearch } from "./~learn";

type BeforeLoadContext = Parameters<
	NonNullable<typeof Route.options.beforeLoad>
>[0];

const makeContext = (role?: "student") => ({
	auth: {
		user: role ? { id: "u-1", email: "u@t.com", name: "User", role } : null,
		isAuthenticated: Boolean(role),
		isLoading: false,
	},
	queryClient: createTestQueryClient(),
});

describe("Course Learn Route", () => {
	beforeAll(() => {
		installAuthInterceptors();
	});

	beforeEach(() => {
		setAccessToken(null);
	});

	it("validates search parameters", () => {
		expect(validateLearnSearch({})).toEqual({
			blockId: undefined,
			positionSeconds: undefined,
		});
		expect(
			validateLearnSearch({ blockId: "b-1", positionSeconds: "10" }),
		).toEqual({
			blockId: "b-1",
			positionSeconds: 10,
		});
		expect(validateLearnSearch({ blockId: "", positionSeconds: -1 })).toEqual({
			blockId: undefined,
			positionSeconds: undefined,
		});
	});

	it("redirects unauthenticated visitor to login", async () => {
		try {
			await Route.options.beforeLoad?.({
				context: makeContext(),
				location: { href: "/courses/course-intro-cs/learn" },
				params: { courseId: "course-intro-cs" },
				search: {},
			} as unknown as BeforeLoadContext);
			expect.fail("Expected redirect");
		} catch (error: unknown) {
			expect(isRedirect(error)).toBe(true);
			if (isRedirect(error)) {
				expect(error.options.to).toBe("/login");
				expect(error.options.search).toEqual({
					redirect: "/courses/course-intro-cs/learn",
				});
			}
		}
	});

	it("redirects non-enrolled student to course details page", async () => {
		setAccessToken(createMockAccessToken("u-1", "STUDENT"));
		try {
			await Route.options.beforeLoad?.({
				context: makeContext("student"),
				location: { href: "/courses/course-none/learn" },
				params: { courseId: "course-none" },
				search: {},
			} as unknown as BeforeLoadContext);
			expect.fail("Expected redirect");
		} catch (error: unknown) {
			expect(isRedirect(error)).toBe(true);
			if (isRedirect(error)) {
				expect(error.options.to).toBe("/courses/$courseId");
				expect(error.options.params).toEqual({ courseId: "course-none" });
			}
		}
	});

	it("permits enrolled student with active access", async () => {
		setAccessToken(createMockAccessToken("u-1", "STUDENT"));
		await expect(
			Route.options.beforeLoad?.({
				context: makeContext("student"),
				location: { href: "/courses/course-intro-cs/learn" },
				params: { courseId: "course-intro-cs" },
				search: {},
			} as unknown as BeforeLoadContext),
		).resolves.not.toThrow();
	});
});
