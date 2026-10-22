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
