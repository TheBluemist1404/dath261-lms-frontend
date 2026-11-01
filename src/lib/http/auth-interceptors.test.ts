import { HttpResponse, http } from "msw";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getAccessToken, setAccessToken } from "@/lib/auth/access-token";
import { restoreSession } from "@/lib/auth/session";
import { createMockAccessToken } from "@/mocks/auth.handlers";
import { useAuthStore } from "@/stores/auth.store";
import { server } from "@/test/mocks/server";
import { installAuthInterceptors } from "./auth-interceptors";
import { httpClient } from "./client";

const staleToken = createMockAccessToken("user-alex", "STUDENT");
const freshToken = `${createMockAccessToken("user-alex", "STUDENT")}-fresh`;

function createExpiringToken(expSecondsFromNow: number): string {
	const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }))
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/, "");
	const payload = btoa(
		JSON.stringify({
			sub: "user-alex",
			role: "STUDENT",
			exp: Math.floor(Date.now() / 1000) + expSecondsFromNow,
			iat: Math.floor(Date.now() / 1000),
		}),
	)
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/, "");
	return `${header}.${payload}.sig`;
}

let uninstall: () => void;

beforeEach(() => {
	uninstall = installAuthInterceptors();
	useAuthStore.getState().reset();
});

afterEach(() => {
	uninstall();
	setAccessToken(null);
});

function protectedEndpoint() {
	const seen: (string | null)[] = [];
	server.use(
		http.get("*/api/protected", ({ request }) => {
			const header = request.headers.get("Authorization");
			seen.push(header);
			return header === `Bearer ${freshToken}`
				? HttpResponse.json({ ok: true })
				: new HttpResponse(null, { status: 401 });
		}),
	);
	return seen;
}

describe("auth interceptors", () => {
	it("refreshes once on 401 and retries with the new Bearer token", async () => {
		setAccessToken(staleToken);
		const seen = protectedEndpoint();
		let refreshCalls = 0;
		server.use(
			http.post("*/api/auth/refresh", () => {
				refreshCalls += 1;
				return HttpResponse.json({ accessToken: freshToken });
			}),
		);

		const [first, second] = await Promise.all([
			httpClient.get("/protected"),
			httpClient.get("/protected"),
		]);

		expect(first.data).toEqual({ ok: true });
		expect(second.data).toEqual({ ok: true });
		expect(refreshCalls).toBe(1);
		expect(
			seen.filter((header) => header === `Bearer ${staleToken}`),
		).toHaveLength(2);
		expect(getAccessToken()).toBe(freshToken);
		expect(useAuthStore.getState().user).toMatchObject({
			id: "user-alex",
			role: "student",
		});
	});

	it("queues multiple concurrent 401s and executes exactly 1 refresh call", async () => {
		setAccessToken(staleToken);
		protectedEndpoint();
		let refreshCalls = 0;
		server.use(
			http.post("*/api/auth/refresh", async () => {
				refreshCalls += 1;
				await new Promise((resolve) => setTimeout(resolve, 50));
				return HttpResponse.json({ accessToken: freshToken });
			}),
		);

		const results = await Promise.all([
			httpClient.get("/protected"),
			httpClient.get("/protected"),
			httpClient.get("/protected"),
		]);

		expect(results[0].data).toEqual({ ok: true });
		expect(results[1].data).toEqual({ ok: true });
		expect(results[2].data).toEqual({ ok: true });
		expect(refreshCalls).toBe(1);
	});

	it("rejects immediately without loop if retried request encounters 401 again", async () => {
		setAccessToken(staleToken);
		let refreshCalls = 0;
		server.use(
			http.get(
				"*/api/always-401",
				() => new HttpResponse(null, { status: 401 }),
			),
			http.post("*/api/auth/refresh", () => {
				refreshCalls += 1;
				return HttpResponse.json({ accessToken: freshToken });
			}),
		);

		await expect(httpClient.get("/always-401")).rejects.toMatchObject({
			response: { status: 401 },
		});
		expect(refreshCalls).toBe(1);
	});

	it("does not refresh when skipAuthRefresh is set on request", async () => {
		setAccessToken(staleToken);
		let refreshCalls = 0;
		server.use(
			http.get(
				"*/api/no-refresh",
				() => new HttpResponse(null, { status: 401 }),
			),
			http.post("*/api/auth/refresh", () => {
				refreshCalls += 1;
				return HttpResponse.json({ accessToken: freshToken });
			}),
		);

		await expect(
			httpClient.get("/no-refresh", { skipAuthRefresh: true }),
		).rejects.toMatchObject({
			response: { status: 401 },
		});
		expect(refreshCalls).toBe(0);
	});

	it("does not refresh when url is an /auth/ endpoint", async () => {
		let refreshCalls = 0;
		server.use(
			http.post(
				"*/api/auth/login",
				() => new HttpResponse(null, { status: 401 }),
			),
			http.post("*/api/auth/refresh", () => {
				refreshCalls += 1;
				return HttpResponse.json({ accessToken: freshToken });
			}),
		);

		await expect(httpClient.post("/auth/login", {})).rejects.toMatchObject({
			response: { status: 401 },
		});
		expect(refreshCalls).toBe(0);
	});

	it("proactively refreshes token if it expires in less than 30s", async () => {
		const expiringToken = createExpiringToken(15);
		setAccessToken(expiringToken);
		const seen: (string | null)[] = [];
		let refreshCalls = 0;

		server.use(
			http.post("*/api/auth/refresh", () => {
				refreshCalls += 1;
				return HttpResponse.json({ accessToken: freshToken });
			}),
			http.get("*/api/proactive-check", ({ request }) => {
				seen.push(request.headers.get("Authorization"));
				return HttpResponse.json({ ok: true });
			}),
		);

		const response = await httpClient.get("/proactive-check");
		expect(response.data).toEqual({ ok: true });
		expect(refreshCalls).toBe(1);
		expect(seen).toEqual([`Bearer ${freshToken}`]);
		expect(getAccessToken()).toBe(freshToken);
	});

	it("deadlock guard: skips proactive refresh for auth endpoints and skipAuthRefresh", async () => {
		const expiringToken = createExpiringToken(10);
		setAccessToken(expiringToken);
		let refreshCalls = 0;

		server.use(
			http.post("*/api/auth/refresh", () => {
				refreshCalls += 1;
				return HttpResponse.json({ accessToken: freshToken });
			}),
			http.get("*/api/skip-proactive", () => HttpResponse.json({ ok: true })),
		);

		await httpClient.get("/skip-proactive", { skipAuthRefresh: true });
		expect(refreshCalls).toBe(0);
	});

	it("signs the user out when the refresh cookie is rejected", async () => {
		setAccessToken(staleToken);
		protectedEndpoint();
		server.use(
			http.post(
				"*/api/auth/refresh",
				() => new HttpResponse(null, { status: 401 }),
			),
		);

		await expect(httpClient.get("/protected")).rejects.toMatchObject({
			response: { status: 401 },
		});
		expect(getAccessToken()).toBeNull();
		expect(useAuthStore.getState().status).toBe("unauthenticated");
	});

	it("rejects all queued requests when concurrent refresh fails", async () => {
		setAccessToken(staleToken);
		protectedEndpoint();
		server.use(
			http.post(
				"*/api/auth/refresh",
				() => new HttpResponse(null, { status: 401 }),
			),
		);

		const results = await Promise.allSettled([
			httpClient.get("/protected"),
			httpClient.get("/protected"),
		]);

		expect(results[0].status).toBe("rejected");
		expect(results[1].status).toBe("rejected");
		expect(getAccessToken()).toBeNull();
		expect(useAuthStore.getState().status).toBe("unauthenticated");
	});
});

describe("restoreSession", () => {
	it("resolves the identity from the refresh cookie on load", async () => {
		server.use(
			http.post("*/api/auth/refresh", () =>
				HttpResponse.json({
					accessToken: createMockAccessToken("user-9", "LECTURER"),
				}),
			),
		);

		await restoreSession();

		expect(useAuthStore.getState()).toMatchObject({
			status: "authenticated",
			user: { id: "user-9", role: "lecturer" },
		});
	});

	it("treats an unreachable backend as signed out", async () => {
		server.use(http.post("*/api/auth/refresh", () => HttpResponse.error()));

		await restoreSession();

		expect(useAuthStore.getState().status).toBe("unauthenticated");
	});
});
