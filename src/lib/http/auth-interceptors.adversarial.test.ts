import { HttpResponse, http } from "msw";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { registerApi } from "@/features/auth/api/auth.api";
import {
	getAccessToken,
	readAccessTokenClaims,
	setAccessToken,
} from "@/lib/auth/access-token";
import {
	buildAuthUser,
	cacheUserProfile,
	decodeJwtClaims,
	isTokenExpiringSoon,
} from "@/lib/auth/jwt-decoder";
import {
	bootstrapSession,
	endSession,
	refreshAccessToken,
} from "@/lib/auth/session";
import { useAuthStore } from "@/stores/auth.store";
import { server } from "@/test/mocks/server";
import { installAuthInterceptors } from "./auth-interceptors";
import { httpClient } from "./client";

function makeJwt(payload: Record<string, unknown>): string {
	const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }))
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/, "");
	const bytes = new TextEncoder().encode(JSON.stringify(payload));
	const payloadStr = btoa(String.fromCharCode(...bytes))
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/, "");
	return `${header}.${payloadStr}.signature_test`;
}

describe("ADVERSARIAL SUITE: PR #13 Token Lifecycle & Refresh Mutex", () => {
	let uninstall: () => void;

	beforeEach(() => {
		uninstall = installAuthInterceptors();
		useAuthStore.getState().reset();
		setAccessToken(null);
		if (typeof localStorage !== "undefined") {
			localStorage.clear();
		}
	});

	afterEach(() => {
		uninstall();
		useAuthStore.getState().reset();
		setAccessToken(null);
		if (typeof localStorage !== "undefined") {
			localStorage.clear();
		}
	});

	// =========================================================================
	// TASK 1: Concurrent 401 Deduplication (Thundering Herd Defense)
	// =========================================================================
	describe("Task 1: Concurrent 401 Deduplication", () => {
		it("stress test: 20 concurrent 401 requests trigger exactly 1 refresh and all 20 resolve", async () => {
			const stale = makeJwt({ sub: "user-stress", role: "STUDENT" });
			const fresh = makeJwt({
				sub: "user-stress",
				role: "STUDENT",
				exp: Math.floor(Date.now() / 1000) + 3600,
			});
			setAccessToken(stale);

			let refreshCount = 0;
			const seenTokens: string[] = [];

			server.use(
				http.post("*/api/auth/refresh", async () => {
					refreshCount += 1;
					// Simulate realistic network latency
					await new Promise((r) => setTimeout(r, 60));
					return HttpResponse.json({ accessToken: fresh });
				}),
				http.get("*/api/stress-endpoint", ({ request }) => {
					const auth = request.headers.get("Authorization");
					if (auth) seenTokens.push(auth);
					if (auth === `Bearer ${fresh}`) {
						return HttpResponse.json({ status: "success", received: auth });
					}
					return new HttpResponse(null, { status: 401 });
				}),
			);

			const requests = Array.from({ length: 20 }, (_, i) =>
				httpClient.get(`/stress-endpoint?req=${i}`),
			);

			const responses = await Promise.all(requests);

			expect(refreshCount).toBe(1);
			expect(responses).toHaveLength(20);
			for (const res of responses) {
				expect(res.data.status).toBe("success");
				expect(res.data.received).toBe(`Bearer ${fresh}`);
			}
			expect(getAccessToken()).toBe(fresh);
			expect(useAuthStore.getState().status).toBe("authenticated");
		});

		it("staggered arrival: requests arriving mid-refresh wait in failedQueue without triggering extra refreshes", async () => {
			const stale = makeJwt({ sub: "user-stagger", role: "STUDENT" });
			const fresh = makeJwt({
				sub: "user-stagger",
				role: "STUDENT",
				exp: Math.floor(Date.now() / 1000) + 3600,
			});
			setAccessToken(stale);

			let refreshCount = 0;
			server.use(
				http.post("*/api/auth/refresh", async () => {
					refreshCount += 1;
					await new Promise((r) => setTimeout(r, 100));
					return HttpResponse.json({ accessToken: fresh });
				}),
				http.get("*/api/stagger-endpoint", ({ request }) => {
					const auth = request.headers.get("Authorization");
					if (auth === `Bearer ${fresh}`) {
						return HttpResponse.json({ ok: true });
					}
					return new HttpResponse(null, { status: 401 });
				}),
			);

			const p1 = httpClient.get("/stagger-endpoint?t=0");
			const p2 = new Promise((resolve) => setTimeout(resolve, 20)).then(() =>
				httpClient.get("/stagger-endpoint?t=20"),
			);
			const p3 = new Promise((resolve) => setTimeout(resolve, 50)).then(() =>
				httpClient.get("/stagger-endpoint?t=50"),
			);
			const p4 = new Promise((resolve) => setTimeout(resolve, 80)).then(() =>
				httpClient.get("/stagger-endpoint?t=80"),
			);

			const results = await Promise.all([p1, p2, p3, p4]);
			expect(refreshCount).toBe(1);
			for (const res of results) {
				expect((res as { data: { ok: boolean } }).data).toEqual({ ok: true });
			}
		});

		it("refresh rejection broadcasts failure to all queued subscribers and clears session", async () => {
			const stale = makeJwt({ sub: "user-fail", role: "STUDENT" });
			setAccessToken(stale);

			let refreshCount = 0;
			server.use(
				http.post("*/api/auth/refresh", async () => {
					refreshCount += 1;
					await new Promise((r) => setTimeout(r, 40));
					return new HttpResponse(null, { status: 401 });
				}),
				http.get(
					"*/api/fail-endpoint",
					() => new HttpResponse(null, { status: 401 }),
				),
			);

			const results = await Promise.allSettled([
				httpClient.get("/fail-endpoint?1"),
				httpClient.get("/fail-endpoint?2"),
				httpClient.get("/fail-endpoint?3"),
				httpClient.get("/fail-endpoint?4"),
			]);

			expect(refreshCount).toBe(1);
			for (const res of results) {
				expect(res.status).toBe("rejected");
			}
			expect(getAccessToken()).toBeNull();
			expect(useAuthStore.getState().status).toBe("unauthenticated");
		});

		it("resets isRefreshing flag so future 401s can refresh again after resolution", async () => {
			const token1 = makeJwt({ sub: "u1", role: "STUDENT" });
			const token2 = makeJwt({ sub: "u1", role: "STUDENT", extra: "2" });
			const token3 = makeJwt({ sub: "u1", role: "STUDENT", extra: "3" });
			setAccessToken(token1);

			let currentAllowed = token2;
			let refreshCount = 0;

			server.use(
				http.post("*/api/auth/refresh", () => {
					refreshCount += 1;
					const tokenToReturn = refreshCount === 1 ? token2 : token3;
					return HttpResponse.json({ accessToken: tokenToReturn });
				}),
				http.get("*/api/sequential", ({ request }) => {
					const auth = request.headers.get("Authorization");
					if (auth === `Bearer ${currentAllowed}`) {
						return HttpResponse.json({ count: refreshCount });
					}
					return new HttpResponse(null, { status: 401 });
				}),
			);

			// Batch 1
			const res1 = await httpClient.get("/sequential");
			expect(res1.data.count).toBe(1);
			expect(refreshCount).toBe(1);

			// Now invalidate token2 and expect token3
			currentAllowed = token3;
			// Batch 2: new request encounters 401
			const res2 = await httpClient.get("/sequential");
			expect(res2.data.count).toBe(2);
			expect(refreshCount).toBe(2);
		});
	});

	// =========================================================================
	// TASK 2: Infinite Loop Prevention
	// =========================================================================
	describe("Task 2: Infinite Loop Prevention", () => {
		it("terminates immediately when retried request returns 401 again (authRetried: true)", async () => {
			const stale = makeJwt({ sub: "u-loop", role: "STUDENT" });
			const fresh = makeJwt({ sub: "u-loop", role: "STUDENT" });
			setAccessToken(stale);

			let refreshAttempts = 0;
			let protectedAttempts = 0;

			server.use(
				http.post("*/api/auth/refresh", () => {
					refreshAttempts += 1;
					return HttpResponse.json({ accessToken: fresh });
				}),
				http.get("*/api/perma-401", () => {
					protectedAttempts += 1;
					// Always return 401 even with fresh token
					return new HttpResponse(null, { status: 401 });
				}),
			);

			await expect(httpClient.get("/perma-401")).rejects.toMatchObject({
				response: { status: 401 },
			});

			// Exactly 1 initial call + 1 retry = 2 calls to protected
			expect(protectedAttempts).toBe(2);
			// Exactly 1 refresh call, NOT an infinite loop
			expect(refreshAttempts).toBe(1);
		});

		it("prevents loops across concurrent retries all returning 401", async () => {
			const stale = makeJwt({ sub: "u-concurrent-loop", role: "STUDENT" });
			const fresh = makeJwt({ sub: "u-concurrent-loop", role: "STUDENT" });
			setAccessToken(stale);

			let refreshAttempts = 0;
			server.use(
				http.post("*/api/auth/refresh", () => {
					refreshAttempts += 1;
					return HttpResponse.json({ accessToken: fresh });
				}),
				http.get(
					"*/api/perma-401-concurrent",
					() => new HttpResponse(null, { status: 401 }),
				),
			);

			const results = await Promise.allSettled([
				httpClient.get("/perma-401-concurrent?1"),
				httpClient.get("/perma-401-concurrent?2"),
				httpClient.get("/perma-401-concurrent?3"),
			]);

			for (const res of results) {
				expect(res.status).toBe("rejected");
			}
			expect(refreshAttempts).toBe(1);
		});

		it("ignores 401 on /auth/ endpoints and never attempts refresh", async () => {
			let refreshAttempts = 0;
			server.use(
				http.post("*/api/auth/refresh", () => {
					refreshAttempts += 1;
					return HttpResponse.json({ accessToken: "fresh" });
				}),
				http.post(
					"*/api/auth/logout",
					() => new HttpResponse(null, { status: 401 }),
				),
				http.post(
					"*/api/auth/register",
					() => new HttpResponse(null, { status: 401 }),
				),
			);

			await expect(httpClient.post("/auth/logout")).rejects.toMatchObject({
				response: { status: 401 },
			});
			await expect(httpClient.post("/auth/register")).rejects.toMatchObject({
				response: { status: 401 },
			});

			expect(refreshAttempts).toBe(0);
		});

		it("ignores 401 when skipAuthRefresh is explicitly true", async () => {
			let refreshAttempts = 0;
			server.use(
				http.post("*/api/auth/refresh", () => {
					refreshAttempts += 1;
					return HttpResponse.json({ accessToken: "fresh" });
				}),
				http.get(
					"*/api/custom-probe",
					() => new HttpResponse(null, { status: 401 }),
				),
			);

			await expect(
				httpClient.get("/custom-probe", { skipAuthRefresh: true }),
			).rejects.toMatchObject({
				response: { status: 401 },
			});

			expect(refreshAttempts).toBe(0);
		});
	});

	// =========================================================================
	// TASK 3: Proactive Expiry (< 30s) and Deadlock Recursion Guard
	// =========================================================================
	describe("Task 3: Proactive Expiry & Deadlock Recursion Guard", () => {
		it("detects expiry boundary accurately in isTokenExpiringSoon", () => {
			const now = Math.floor(Date.now() / 1000);

			// Expiry 29s in future -> expiring soon
			expect(
				isTokenExpiringSoon(
					makeJwt({ sub: "u", role: "STUDENT", exp: now + 29 }),
					30,
				),
			).toBe(true);

			// Expiry 30s in future -> expiring soon (threshold boundary <= 30s)
			expect(
				isTokenExpiringSoon(
					makeJwt({ sub: "u", role: "STUDENT", exp: now + 30 }),
					30,
				),
			).toBe(true);

			// Expiry 35s in future -> NOT expiring soon
			expect(
				isTokenExpiringSoon(
					makeJwt({ sub: "u", role: "STUDENT", exp: now + 35 }),
					30,
				),
			).toBe(false);

			// Expiry in past (-10s) -> expiring soon (already expired)
			expect(
				isTokenExpiringSoon(
					makeJwt({ sub: "u", role: "STUDENT", exp: now - 10 }),
					30,
				),
			).toBe(true);

			// Missing exp -> false
			expect(
				isTokenExpiringSoon(makeJwt({ sub: "u", role: "STUDENT" }), 30),
			).toBe(false);
		});

		it("proactively refreshes before request dispatch when token exp < 30s", async () => {
			const now = Math.floor(Date.now() / 1000);
			const expiringToken = makeJwt({
				sub: "u-proactive",
				role: "STUDENT",
				exp: now + 15,
			});
			const freshToken = makeJwt({
				sub: "u-proactive",
				role: "STUDENT",
				exp: now + 3600,
			});
			setAccessToken(expiringToken);

			let refreshDispatched = 0;
			let authorizationHeaderSeen = "";

			server.use(
				http.post("*/api/auth/refresh", () => {
					refreshDispatched += 1;
					return HttpResponse.json({ accessToken: freshToken });
				}),
				http.get("*/api/proactive-target", ({ request }) => {
					authorizationHeaderSeen = request.headers.get("Authorization") ?? "";
					return HttpResponse.json({ ok: true });
				}),
			);

			const res = await httpClient.get("/proactive-target");
			expect(res.data).toEqual({ ok: true });
			expect(refreshDispatched).toBe(1);
			expect(authorizationHeaderSeen).toBe(`Bearer ${freshToken}`);
			expect(getAccessToken()).toBe(freshToken);
		});

		it("deadlock guard: /auth/refresh request with skipAuthRefresh does NOT trigger recursion", async () => {
			const now = Math.floor(Date.now() / 1000);
			const expiringToken = makeJwt({
				sub: "u-deadlock",
				role: "STUDENT",
				exp: now + 5,
			});
			setAccessToken(expiringToken);

			let refreshCallCount = 0;
			server.use(
				http.post("*/api/auth/refresh", () => {
					refreshCallCount += 1;
					return HttpResponse.json({
						accessToken: makeJwt({
							sub: "u-deadlock",
							role: "STUDENT",
							exp: now + 3600,
						}),
					});
				}),
			);

			// Direct invocation of refreshAccessToken should not recurse
			const result = await refreshAccessToken();
			expect(result).toBeTruthy();
			expect(refreshCallCount).toBe(1);
		});

		it("proactive refresh deduplicates concurrent outbound requests to 1 refresh call", async () => {
			const now = Math.floor(Date.now() / 1000);
			const expiringToken = makeJwt({
				sub: "u-concurrent-proactive",
				role: "STUDENT",
				exp: now + 10,
			});
			const freshToken = makeJwt({
				sub: "u-concurrent-proactive",
				role: "STUDENT",
				exp: now + 3600,
			});
			setAccessToken(expiringToken);

			let refreshCallCount = 0;
			server.use(
				http.post("*/api/auth/refresh", async () => {
					refreshCallCount += 1;
					await new Promise((r) => setTimeout(r, 50));
					return HttpResponse.json({ accessToken: freshToken });
				}),
				http.get("*/api/proactive-concurrent", ({ request }) => {
					const auth = request.headers.get("Authorization");
					return HttpResponse.json({ tokenUsed: auth });
				}),
			);

			const [r1, r2, r3, r4] = await Promise.all([
				httpClient.get("/proactive-concurrent?a"),
				httpClient.get("/proactive-concurrent?b"),
				httpClient.get("/proactive-concurrent?c"),
				httpClient.get("/proactive-concurrent?d"),
			]);

			expect(refreshCallCount).toBe(1);
			expect(r1.data.tokenUsed).toBe(`Bearer ${freshToken}`);
			expect(r2.data.tokenUsed).toBe(`Bearer ${freshToken}`);
			expect(r3.data.tokenUsed).toBe(`Bearer ${freshToken}`);
			expect(r4.data.tokenUsed).toBe(`Bearer ${freshToken}`);
		});

		it("proactive refresh failure (401) clears auth store and rejects outgoing request", async () => {
			const now = Math.floor(Date.now() / 1000);
			const expiringToken = makeJwt({
				sub: "u-proactive-fail",
				role: "STUDENT",
				exp: now + 5,
			});
			setAccessToken(expiringToken);

			let _refreshCallCount = 0;
			server.use(
				http.post("*/api/auth/refresh", () => {
					_refreshCallCount += 1;
					return new HttpResponse(null, { status: 401 });
				}),
				http.get(
					"*/api/target-fail",
					() => new HttpResponse(null, { status: 401 }),
				),
			);

			await expect(httpClient.get("/target-fail")).rejects.toMatchObject({
				response: { status: 401 },
			});

			expect(getAccessToken()).toBeNull();
			expect(useAuthStore.getState().status).toBe("unauthenticated");
		});
	});

	// =========================================================================
	// TASK 4: JWT Claims Decoding & Edge Cases
	// =========================================================================
	describe("Task 4: JWT Claims Decoding", () => {
		it("decodes Vietnamese UTF-8 multi-byte characters with tones and diacritics", () => {
			const token = makeJwt({
				sub: "vn-user-01",
				role: "LECTURER",
				firstName: "Nguyễn",
				lastName: "Văn Ái Quốc",
				email: "quoc.nguyen@nodus.edu.vn",
			});

			const claims = decodeJwtClaims(token);
			expect(claims.firstName).toBe("Nguyễn");
			expect(claims.lastName).toBe("Văn Ái Quốc");

			const user = buildAuthUser(claims);
			expect(user.name).toBe("Nguyễn Văn Ái Quốc");
			expect(user.role).toBe("lecturer");
		});

		it("throws on malformed, truncated, or non-JWT tokens", () => {
			expect(() => decodeJwtClaims("")).toThrow();
			expect(() => decodeJwtClaims("invalid")).toThrow();
			expect(() => decodeJwtClaims("a.b")).toThrow();
			expect(() => decodeJwtClaims("a.b.c.d")).toThrow();
			expect(() => decodeJwtClaims("header.invalid-base64-@@@.sig")).toThrow();
			expect(() => decodeJwtClaims(null as unknown as string)).toThrow();
			expect(() => decodeJwtClaims(undefined as unknown as string)).toThrow();
			expect(() => decodeJwtClaims(12345 as unknown as string)).toThrow();
		});

		it("throws when sub claim is missing or not a string", () => {
			const noSub = makeJwt({ role: "STUDENT" });
			expect(() => decodeJwtClaims(noSub)).toThrow(
				"missing or invalid sub claim",
			);

			const numSub = makeJwt({ sub: 12345, role: "STUDENT" });
			expect(() => decodeJwtClaims(numSub)).toThrow(
				"missing or invalid sub claim",
			);
		});

		it("reads claims safely via readAccessTokenClaims", () => {
			const studentToken = makeJwt({ sub: "usr-student", role: "STUDENT" });
			expect(readAccessTokenClaims(studentToken)).toEqual({
				userId: "usr-student",
				role: "student",
			});

			const lecturerToken = makeJwt({ sub: "usr-lecturer", role: "LECTURER" });
			expect(readAccessTokenClaims(lecturerToken)).toEqual({
				userId: "usr-lecturer",
				role: "lecturer",
			});

			const adminToken = makeJwt({ sub: "usr-admin", role: "ADMIN" });
			expect(readAccessTokenClaims(adminToken)).toEqual({
				userId: "usr-admin",
				role: "admin",
			});

			// Unknown role
			const unknownToken = makeJwt({ sub: "usr-unknown", role: "SUPERUSER" });
			expect(readAccessTokenClaims(unknownToken)).toBeNull();

			// Malformed token returns null without throwing
			expect(readAccessTokenClaims("not-a-token")).toBeNull();
		});

		it("buildAuthUser implements defensive cascading fallbacks", () => {
			// 1. Claims full name
			const u1 = buildAuthUser({
				sub: "u1",
				role: "STUDENT",
				firstName: "Alex",
				lastName: "Le",
				email: "alex@nodus.edu",
			});
			expect(u1.name).toBe("Alex Le");
			expect(u1.email).toBe("alex@nodus.edu");

			// 2. Only first name
			const u2 = buildAuthUser({
				sub: "u2",
				role: "STUDENT",
				firstName: "Alex",
			});
			expect(u2.name).toBe("Alex");

			// 3. Cached profile fallback
			cacheUserProfile("u3", {
				name: "Cached User",
				email: "cached@nodus.edu",
			});
			const u3 = buildAuthUser({ sub: "u3", role: "STUDENT" });
			expect(u3.name).toBe("Cached User");
			expect(u3.email).toBe("cached@nodus.edu");

			// 4. Fallback email prefix
			const u4 = buildAuthUser(
				{ sub: "u4", role: "STUDENT" },
				"login.prefix@nodus.edu",
			);
			expect(u4.email).toBe("login.prefix@nodus.edu");
			expect(u4.name).toBe("login.prefix");

			// 5. Completely empty info
			const u5 = buildAuthUser({ sub: "u5", role: "STUDENT" });
			expect(u5.name).toBe("");
			expect(u5.email).toBe("");
		});
	});

	// =========================================================================
	// TASK 5: Register Does Not Mutate Auth Store (Zombie Session Prevention)
	// =========================================================================
	describe("Task 5: Zombie Session Elimination", () => {
		it("registerApi sends correct payload and does NOT modify in-memory token or store", async () => {
			useAuthStore.getState().clearAuth();
			expect(useAuthStore.getState().status).toBe("unauthenticated");
			expect(getAccessToken()).toBeNull();

			let sentBody: Record<string, unknown> | null = null;
			server.use(
				http.post("*/api/auth/register", async ({ request }) => {
					sentBody = (await request.json()) as Record<string, unknown>;
					return HttpResponse.json(
						{
							user: {
								id: "usr-new-registered",
								email: "registered@nodus.edu",
								role: "STUDENT",
								status: "ACTIVE",
								firstName: "Registered",
								lastName: "Student",
								createdAt: "2026-11-01T00:00:00.000Z",
								updatedAt: "2026-11-01T00:00:00.000Z",
							},
						},
						{ status: 201 },
					);
				}),
			);

			const response = await registerApi({
				firstName: "Registered",
				lastName: "Student",
				email: "registered@nodus.edu",
				password: "Password123!",
				role: "student",
			});

			expect(sentBody).toEqual({
				email: "registered@nodus.edu",
				password: "Password123!",
				role: "STUDENT",
				firstName: "Registered",
				lastName: "Student",
			});

			expect(response.user.id).toBe("usr-new-registered");

			expect(useAuthStore.getState().status).toBe("unauthenticated");
			expect(useAuthStore.getState().user).toBeNull();
			expect(getAccessToken()).toBeNull();
		});

		it("bootstrapSession returns unauthenticated context and does NOT establish zombie session on 401", async () => {
			server.use(
				http.post("*/api/auth/refresh", () =>
					HttpResponse.json({ message: "No cookie" }, { status: 401 }),
				),
			);

			const ctx = await bootstrapSession();
			expect(ctx.isAuthenticated).toBe(false);
			expect(ctx.user).toBeNull();
			expect(useAuthStore.getState().status).toBe("unauthenticated");
			expect(getAccessToken()).toBeNull();
		});

		it("logout clears in-memory token and resets store even when logoutApi fails with 500", async () => {
			setAccessToken("valid-token");
			useAuthStore.getState().setUser({
				id: "u-logout-fail",
				role: "student",
				name: "Student",
				email: "student@nodus.edu",
			});

			server.use(
				http.post(
					"*/api/auth/logout",
					() => new HttpResponse(null, { status: 500 }),
				),
			);

			// Calling endSession directly or via logout
			try {
				await httpClient.post("/auth/logout", null, { skipAuthRefresh: true });
			} catch {
				endSession();
			}

			expect(getAccessToken()).toBeNull();
			expect(useAuthStore.getState().status).toBe("unauthenticated");
			expect(useAuthStore.getState().user).toBeNull();
		});
	});
});
