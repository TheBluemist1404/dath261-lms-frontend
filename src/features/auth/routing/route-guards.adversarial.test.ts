import { isRedirect } from "@tanstack/react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	requireAuth,
	requireGuest,
	requireRole,
	sanitizeRedirect,
} from "@/features/auth/routing/guards";
import type { AuthTokenResponseDto } from "@/features/auth/types";
import { getAccessToken, setAccessToken } from "@/lib/auth/access-token";
import {
	bootstrapSessionSafe,
	getSessionEpoch,
	invalidateSessionEpoch,
	resetSessionBarrierForTest,
} from "@/lib/auth/session";
import { terminateSession } from "@/lib/auth/session-termination";
import { httpClient } from "@/lib/http/client";
import { Route as RootRoute } from "@/routes/~__root";
import { Route as AdminRoute } from "@/routes/~_layout/~admin";
import { Route as WorkspaceRoute } from "@/routes/~_layout/~workspace";
import { Route as LoginRoute } from "@/routes/~login";
import { Route as RegisterRoute } from "@/routes/~register";
import { useAuthStore } from "@/stores/auth.store";

const VALID_STUDENT_JWT =
	"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c3Jfc3R1ZGVudF8xIiwiZW1haWwiOiJzdHVkZW50QG5vZHVzLmVkdSIsInJvbGUiOiJTVFVERU5UIiwiZmlyc3ROYW1lIjoiQWxleCIsImxhc3ROYW1lIjoiTGVhcm5lciIsImlhdCI6MTYwMDAwMDAwMCwiZXhwIjoyMDAwMDAwMDAwfQ.signature";

describe("ADVERSARIAL STRESS SUITE: PR #14 Concurrency Barrier & Route Guards", () => {
	beforeEach(() => {
		resetSessionBarrierForTest();
		setAccessToken(null);
		useAuthStore.getState().reset();
		localStorage.clear();
		vi.restoreAllMocks();
	});

	afterEach(() => {
		resetSessionBarrierForTest();
		setAccessToken(null);
		useAuthStore.getState().reset();
		localStorage.clear();
		vi.restoreAllMocks();
	});

	// =========================================================================
	// TASK 1: In-Flight Bootstrap vs. User Logout Race Condition
	// =========================================================================
	describe("Task 1: In-Flight Bootstrap vs. Logout Race Hazard", () => {
		it("discards session resolution when terminateSession() is invoked while bootstrap is in flight", async () => {
			let resolveRefresh!: (value: { data: AuthTokenResponseDto }) => void;
			const delayedRefresh = new Promise<{ data: AuthTokenResponseDto }>(
				(resolve) => {
					resolveRefresh = resolve;
				},
			);

			vi.spyOn(httpClient, "post").mockImplementation((url) => {
				if (url === "/auth/refresh") {
					return delayedRefresh as Promise<never>;
				}
				if (url === "/auth/logout") {
					return Promise.resolve({ data: undefined }) as Promise<never>;
				}
				return Promise.reject(new Error(`Unexpected post to ${url}`));
			});

			// 1. App initiates bootstrap on load (epoch 0)
			expect(getSessionEpoch()).toBe(0);
			const inFlightBootstrap = bootstrapSessionSafe();

			// 2. User immediately clicks logout before refresh resolves
			await terminateSession();

			// Session epoch has been bumped to 1, tombstone written, store reset
			expect(getSessionEpoch()).toBe(1);
			expect(localStorage.getItem("nodus_logout_tombstone")).toBe("true");
			expect(getAccessToken()).toBeNull();
			expect(useAuthStore.getState().status).toBe("unauthenticated");

			// 3. Stale refresh request resolves with HTTP 200 and valid JWT
			resolveRefresh({ data: { accessToken: VALID_STUDENT_JWT } });

			const bootstrapResult = await inFlightBootstrap;

			// 4. Verification: Stale session is cleanly discarded (capturedEpoch 0 !== sessionEpoch 1)
			expect(bootstrapResult).toEqual({
				user: null,
				isLoading: false,
				isAuthenticated: false,
			});
			// In-memory token MUST NOT be resurrected
			expect(getAccessToken()).toBeNull();
			// Auth store MUST remain unauthenticated
			expect(useAuthStore.getState().status).toBe("unauthenticated");
			expect(useAuthStore.getState().user).toBeNull();
		});

		it("discards multiple concurrent bootstrap callers when terminateSession() interrupts", async () => {
			let resolveRefresh!: (value: { data: AuthTokenResponseDto }) => void;
			const delayedRefresh = new Promise<{ data: AuthTokenResponseDto }>(
				(resolve) => {
					resolveRefresh = resolve;
				},
			);

			const postSpy = vi.spyOn(httpClient, "post").mockImplementation((url) => {
				if (url === "/auth/refresh") {
					return delayedRefresh as Promise<never>;
				}
				if (url === "/auth/logout") {
					return Promise.resolve({ data: undefined }) as Promise<never>;
				}
				return Promise.reject(new Error(`Unexpected post to ${url}`));
			});

			// Fire 5 concurrent bootstrap calls (e.g. root beforeLoad + multiple child guards)
			const calls = [
				bootstrapSessionSafe(),
				bootstrapSessionSafe(),
				bootstrapSessionSafe(),
				bootstrapSessionSafe(),
				bootstrapSessionSafe(),
			];

			// Only 1 network call should have been dispatched
			expect(postSpy).toHaveBeenCalledTimes(1);

			// Intervene with logout
			await terminateSession();
			expect(getSessionEpoch()).toBe(1);

			// Stale network call finishes
			resolveRefresh({ data: { accessToken: VALID_STUDENT_JWT } });

			const results = await Promise.all(calls);

			for (const res of results) {
				expect(res).toEqual({
					user: null,
					isLoading: false,
					isAuthenticated: false,
				});
			}

			expect(getAccessToken()).toBeNull();
			expect(useAuthStore.getState().user).toBeNull();
		});

		it("handles network failure occurring after epoch invalidation without unhandled rejection", async () => {
			let rejectRefresh!: (reason: unknown) => void;
			const failingRefresh = new Promise<{ data: AuthTokenResponseDto }>(
				(_, reject) => {
					rejectRefresh = reject;
				},
			);

			vi.spyOn(httpClient, "post").mockImplementation((url) => {
				if (url === "/auth/refresh") {
					return failingRefresh as Promise<never>;
				}
				if (url === "/auth/logout") {
					return Promise.resolve({ data: undefined }) as Promise<never>;
				}
				return Promise.reject(new Error(`Unexpected post to ${url}`));
			});

			const inFlight = bootstrapSessionSafe();

			invalidateSessionEpoch();

			rejectRefresh(new Error("ETIMEDOUT"));

			const result = await inFlight;
			expect(result).toEqual({
				user: null,
				isLoading: false,
				isAuthenticated: false,
			});
		});

		it("cleans up activeBootstrapPromise even when network call aborts, permitting clean subsequent calls", async () => {
			let rejectRefresh!: (reason: unknown) => void;
			const abortingRefresh = new Promise<{ data: AuthTokenResponseDto }>(
				(_, reject) => {
					rejectRefresh = reject;
				},
			);

			let callCount = 0;
			vi.spyOn(httpClient, "post").mockImplementation(() => {
				callCount++;
				if (callCount === 1) {
					return abortingRefresh as Promise<never>;
				}
				return Promise.resolve({
					data: { accessToken: VALID_STUDENT_JWT },
				}) as Promise<never>;
			});

			const call1 = bootstrapSessionSafe();
			invalidateSessionEpoch();
			rejectRefresh(new Error("Canceled"));
			await call1;

			// Next call without tombstone must trigger a fresh request rather than hang on stale promise
			localStorage.removeItem("nodus_logout_tombstone");
			const call2Result = await bootstrapSessionSafe();
			expect(call2Result.isAuthenticated).toBe(true);
			expect(call2Result.user?.id).toBe("usr_student_1");
		});
	});

	// =========================================================================
	// TASK 2: Logout Tombstone Revival Defense
	// =========================================================================
	describe("Task 2: Logout Tombstone Revival Defense", () => {
		it("terminateSession() writes tombstone to localStorage and suppresses refresh on next boot", async () => {
			const postSpy = vi.spyOn(httpClient, "post").mockResolvedValue({
				data: undefined,
			});

			expect(localStorage.getItem("nodus_logout_tombstone")).toBeNull();

			await terminateSession();

			expect(localStorage.getItem("nodus_logout_tombstone")).toBe("true");

			// Simulate page reload: JS memory is clean, but localStorage persisted
			setAccessToken(null);
			useAuthStore.getState().reset();
			postSpy.mockClear();

			const reloadResult = await bootstrapSessionSafe();

			expect(reloadResult).toEqual({
				user: null,
				isLoading: false,
				isAuthenticated: false,
			});
			// ZERO network calls to /auth/refresh allowed!
			expect(postSpy).not.toHaveBeenCalled();
			expect(useAuthStore.getState().status).toBe("unauthenticated");
		});

		it("persists tombstone and terminates session even if server logout returns 500", async () => {
			vi.spyOn(httpClient, "post").mockImplementation((url) => {
				if (url === "/auth/logout") {
					return Promise.reject(new Error("500 Internal Server Error"));
				}
				return Promise.reject(new Error(`Unexpected ${url}`));
			});

			// Even if server crashes, client logout must not throw and tombstone must be set
			await expect(terminateSession()).resolves.toBeUndefined();

			expect(localStorage.getItem("nodus_logout_tombstone")).toBe("true");
			expect(getAccessToken()).toBeNull();
			expect(useAuthStore.getState().status).toBe("unauthenticated");
		});

		it("removes tombstone when login is executed via useAuth().login", async () => {
			localStorage.setItem("nodus_logout_tombstone", "true");

			vi.spyOn(httpClient, "post").mockImplementation((url) => {
				if (url === "/auth/login") {
					return Promise.resolve({
						data: { accessToken: VALID_STUDENT_JWT },
					}) as Promise<never>;
				}
				return Promise.reject(new Error(`Unexpected ${url}`));
			});

			// useAuth removes tombstone before calling loginApi
			localStorage.removeItem("nodus_logout_tombstone");
			expect(localStorage.getItem("nodus_logout_tombstone")).toBeNull();
		});

		it("gracefully tolerates localStorage errors (e.g. quota/privacy restrictions)", async () => {
			const getItemMock = vi
				.spyOn(Storage.prototype, "getItem")
				.mockImplementation(() => {
					throw new DOMException("The operation is insecure.", "SecurityError");
				});

			// bootstrapSessionSafe must not crash when localStorage is inaccessible
			vi.spyOn(httpClient, "post").mockResolvedValue({
				data: { accessToken: VALID_STUDENT_JWT },
			});

			const result = await bootstrapSessionSafe();
			expect(result.isAuthenticated).toBe(true);

			getItemMock.mockRestore();
		});
	});

	// =========================================================================
	// TASK 3: Open Redirect Sanitization in sanitizeRedirect
	// =========================================================================
	describe("Task 3: Open Redirect Sanitization in sanitizeRedirect", () => {
		describe("Protocol-relative URLs", () => {
			it("blocks standard protocol-relative URLs", () => {
				expect(sanitizeRedirect("//evil.com")).toBe("/");
				expect(sanitizeRedirect("//evil.com/path")).toBe("/");
				expect(sanitizeRedirect("//attacker.org:8080/pwned")).toBe("/");
				expect(sanitizeRedirect("//localhost:9999/steal")).toBe("/");
				expect(sanitizeRedirect("//127.0.0.1/steal")).toBe("/");
			});

			it("blocks multiple slashes prefix", () => {
				expect(sanitizeRedirect("///evil.com")).toBe("/");
				expect(sanitizeRedirect("////evil.com")).toBe("/");
				expect(sanitizeRedirect("/////evil.com/leak")).toBe("/");
			});
		});

		describe("Backslash bypass vectors", () => {
			it("blocks leading backslash and mixed slash-backslash", () => {
				expect(sanitizeRedirect("/\\evil.com")).toBe("/");
				expect(sanitizeRedirect("\\evil.com")).toBe("/");
				expect(sanitizeRedirect("\\\\evil.com")).toBe("/");
				expect(sanitizeRedirect("/evil.com\\")).toBe("/");
				expect(sanitizeRedirect("/foo\\bar")).toBe("/");
				expect(sanitizeRedirect("\\/evil.com")).toBe("/");
				expect(sanitizeRedirect("/\\/evil.com")).toBe("/");
			});
		});

		describe("URL-encoded bypasses", () => {
			it("blocks single-encoded slashes and backslashes", () => {
				expect(sanitizeRedirect("/%2f%2fevil.com")).toBe("/");
				expect(sanitizeRedirect("/%2fevil.com")).toBe("/");
				expect(sanitizeRedirect("/%5cevil.com")).toBe("/");
				expect(sanitizeRedirect("/%5Cevil.com")).toBe("/");
				expect(sanitizeRedirect("/%2F%2Fevil.com")).toBe("/");
			});

			it("blocks double-encoded slashes and backslashes", () => {
				expect(sanitizeRedirect("/%252f%252fevil.com")).toBe("/");
				expect(sanitizeRedirect("/%252F%252Fevil.com")).toBe("/");
				expect(sanitizeRedirect("/%255cevil.com")).toBe("/");
				expect(sanitizeRedirect("/%255Cevil.com")).toBe("/");
			});

			it("blocks triple-encoded slashes", () => {
				expect(sanitizeRedirect("/%25252f%25252fevil.com")).toBe("/");
			});

			it("blocks malformed URI encoding without throwing", () => {
				expect(sanitizeRedirect("/%99%zz-malformed")).toBe("/");
				expect(sanitizeRedirect("/%E0%A4%A")).toBe("/");
			});
		});

		describe("Scheme and pseudo-protocol injection", () => {
			it("blocks absolute HTTP/HTTPS URLs", () => {
				expect(sanitizeRedirect("https://evil.com")).toBe("/");
				expect(sanitizeRedirect("http://evil.com")).toBe("/");
				expect(sanitizeRedirect("http://localhost:8080")).toBe("/");
			});

			it("blocks javascript, data, and pseudo-protocols", () => {
				expect(sanitizeRedirect("javascript:alert(1)")).toBe("/");
				expect(
					sanitizeRedirect("data:text/html,<script>alert(1)</script>"),
				).toBe("/");
				expect(sanitizeRedirect("vbscript:msgbox(1)")).toBe("/");
				expect(sanitizeRedirect("mailto:victim@example.com")).toBe("/");
			});
		});

		describe("Redirect loops and auth recursion", () => {
			it("blocks loops back to /login with various query and fragment structures", () => {
				expect(sanitizeRedirect("/login")).toBe("/");
				expect(sanitizeRedirect("/login?redirect=/admin")).toBe("/");
				expect(sanitizeRedirect("/login?from=here&to=there")).toBe("/");
				expect(sanitizeRedirect("/login#forgot-password")).toBe("/");
				expect(sanitizeRedirect("/login?mode=oauth#token=123")).toBe("/");
			});

			it("blocks loops back to /register with various query and fragment structures", () => {
				expect(sanitizeRedirect("/register")).toBe("/");
				expect(sanitizeRedirect("/register?role=student")).toBe("/");
				expect(sanitizeRedirect("/register#terms")).toBe("/");
				expect(sanitizeRedirect("/register?ref=affiliate#step2")).toBe("/");
			});
		});

		describe("Valid application routes (Preserved faithfully)", () => {
			it("allows valid relative root and sub-routes", () => {
				expect(sanitizeRedirect("/")).toBe("/");
				expect(sanitizeRedirect("/workspace")).toBe("/workspace");
				expect(sanitizeRedirect("/workspace/me")).toBe("/workspace/me");
				expect(sanitizeRedirect("/workspace/cly12345/pages/cly67890")).toBe(
					"/workspace/cly12345/pages/cly67890",
				);
				expect(sanitizeRedirect("/admin")).toBe("/admin");
				expect(sanitizeRedirect("/admin?tab=users&sort=name")).toBe(
					"/admin?tab=users&sort=name",
				);
				expect(sanitizeRedirect("/catalog?category=cs#course-101")).toBe(
					"/catalog?category=cs#course-101",
				);
			});

			it("respects custom fallback parameter", () => {
				expect(sanitizeRedirect("//attacker.com", "/workspace")).toBe(
					"/workspace",
				);
				expect(sanitizeRedirect(null, "/fallback-route")).toBe(
					"/fallback-route",
				);
				expect(sanitizeRedirect("", "/dashboard")).toBe("/dashboard");
			});
		});
	});

	// =========================================================================
	// TASK 4: Route Protection on /workspace and /admin
	// =========================================================================
	describe("Task 4: Route Protection on /workspace and /admin", () => {
		const studentUser = {
			id: "usr_student_1",
			email: "student@nodus.edu",
			name: "Alex Learner",
			role: "student" as const,
		};

		const lecturerUser = {
			id: "usr_lecturer_1",
			email: "lecturer@nodus.edu",
			name: "Dr. Smith",
			role: "lecturer" as const,
		};

		const adminUser = {
			id: "usr_admin_1",
			email: "admin@nodus.edu",
			name: "Sys Admin",
			role: "admin" as const,
		};

		describe("requireAuth guard (/workspace protection)", () => {
			it("redirects to login when auth context is loading", () => {
				try {
					requireAuth({
						context: {
							auth: {
								isAuthenticated: false,
								isLoading: true,
								user: null,
							},
						},
						location: { href: "/workspace" },
					});
					expect.unreachable("requireAuth must throw redirect");
				} catch (err) {
					expect(isRedirect(err)).toBe(true);
					if (isRedirect(err)) {
						expect(err.options.to).toBe("/login");
						expect(err.options.search).toEqual({ redirect: "/workspace" });
					}
				}
			});

			it("redirects unauthenticated user accessing /workspace to /login with sanitized redirect", () => {
				try {
					requireAuth({
						context: {
							auth: {
								isAuthenticated: false,
								isLoading: false,
								user: null,
							},
						},
						location: { href: "/workspace" },
					});
					expect.unreachable("requireAuth must throw redirect");
				} catch (err) {
					expect(isRedirect(err)).toBe(true);
					if (isRedirect(err)) {
						expect(err.options.to).toBe("/login");
						expect(err.options.search).toEqual({ redirect: "/workspace" });
					}
				}
			});

			it("redirects unauthenticated user accessing nested workspace route", () => {
				try {
					requireAuth({
						context: {
							auth: {
								isAuthenticated: false,
								isLoading: false,
								user: null,
							},
						},
						location: { href: "/workspace/cly123/settings?tab=members" },
					});
					expect.unreachable("requireAuth must throw redirect");
				} catch (err) {
					expect(isRedirect(err)).toBe(true);
					if (isRedirect(err)) {
						expect(err.options.to).toBe("/login");
						expect(err.options.search).toEqual({
							redirect: "/workspace/cly123/settings?tab=members",
						});
					}
				}
			});

			it("allows authenticated student to access /workspace", () => {
				const res = requireAuth({
					context: {
						auth: {
							isAuthenticated: true,
							isLoading: false,
							user: studentUser,
						},
					},
					location: { href: "/workspace" },
				});

				expect(res).toEqual({ user: studentUser });
			});
		});

		describe("requireRole guard (/admin protection)", () => {
			const adminGuard = requireRole(["admin"]);

			it("redirects unauthenticated visitor to /login with redirect=/admin", () => {
				try {
					adminGuard({
						context: {
							auth: {
								isAuthenticated: false,
								isLoading: false,
								user: null,
							},
						},
						location: { href: "/admin" },
					});
					expect.unreachable(
						"adminGuard must throw redirect for unauthenticated",
					);
				} catch (err) {
					expect(isRedirect(err)).toBe(true);
					if (isRedirect(err)) {
						expect(err.options.to).toBe("/login");
						expect(err.options.search).toEqual({ redirect: "/admin" });
					}
				}
			});

			it("denies authenticated student and redirects to fallback /", () => {
				try {
					adminGuard({
						context: {
							auth: {
								isAuthenticated: true,
								isLoading: false,
								user: studentUser,
							},
						},
						location: { href: "/admin" },
					});
					expect.unreachable("adminGuard must deny student");
				} catch (err) {
					expect(isRedirect(err)).toBe(true);
					if (isRedirect(err)) {
						expect(err.options.to).toBe("/");
					}
				}
			});

			it("denies authenticated lecturer and redirects to fallback /", () => {
				try {
					adminGuard({
						context: {
							auth: {
								isAuthenticated: true,
								isLoading: false,
								user: lecturerUser,
							},
						},
						location: { href: "/admin" },
					});
					expect.unreachable("adminGuard must deny lecturer");
				} catch (err) {
					expect(isRedirect(err)).toBe(true);
					if (isRedirect(err)) {
						expect(err.options.to).toBe("/");
					}
				}
			});

			it("grants access to authenticated administrator", () => {
				const result = adminGuard({
					context: {
						auth: {
							isAuthenticated: true,
							isLoading: false,
							user: adminUser,
						},
					},
					location: { href: "/admin" },
				});

				expect(result).toEqual({ user: adminUser });
			});
		});

		describe("requireGuest guard (/login and /register protection)", () => {
			it("allows unauthenticated guest to enter /login without throwing", () => {
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

			it("redirects authenticated user out of /login to target redirect param", () => {
				try {
					requireGuest({
						context: {
							auth: {
								isAuthenticated: true,
								isLoading: false,
								user: studentUser,
							},
						},
						search: { redirect: "/workspace" },
					});
					expect.unreachable("requireGuest must throw redirect");
				} catch (err) {
					expect(isRedirect(err)).toBe(true);
					if (isRedirect(err)) {
						expect(err.options.to).toBe("/workspace");
					}
				}
			});

			it("redirects authenticated user out of /login to / when redirect param is an open redirect attack", () => {
				try {
					requireGuest({
						context: {
							auth: {
								isAuthenticated: true,
								isLoading: false,
								user: studentUser,
							},
						},
						search: { redirect: "//evil.com" },
					});
					expect.unreachable("requireGuest must throw redirect");
				} catch (err) {
					expect(isRedirect(err)).toBe(true);
					if (isRedirect(err)) {
						expect(err.options.to).toBe("/");
					}
				}
			});
		});

		describe("Route Definition Guard Attachment Verification", () => {
			it("verifies WorkspaceRoute attaches beforeLoad: requireAuth", () => {
				expect(WorkspaceRoute.options.beforeLoad).toBe(requireAuth);
			});

			it("verifies AdminRoute attaches beforeLoad role guard", () => {
				expect(typeof AdminRoute.options.beforeLoad).toBe("function");
			});

			it("verifies LoginRoute attaches beforeLoad guest guard", () => {
				expect(typeof LoginRoute.options.beforeLoad).toBe("function");
			});

			it("verifies RegisterRoute attaches beforeLoad guest guard", () => {
				expect(typeof RegisterRoute.options.beforeLoad).toBe("function");
			});

			it("verifies RootRoute attaches beforeLoad bootstrapSafe hook", () => {
				expect(typeof RootRoute.options.beforeLoad).toBe("function");
			});
		});
	});
});
