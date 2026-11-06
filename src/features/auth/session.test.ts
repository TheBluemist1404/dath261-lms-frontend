import { HttpResponse, http } from "msw";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { setAccessToken } from "@/lib/auth/access-token";
import { useAuthStore } from "@/stores/auth.store";
import { server } from "@/test/mocks/server";
import { bootstrapSession } from "./session";

function createJwt(payload: Record<string, unknown>): string {
	const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }))
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/, "");
	const bytes = new TextEncoder().encode(JSON.stringify(payload));
	const payloadStr = btoa(String.fromCharCode(...bytes))
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/, "");
	return `${header}.${payloadStr}.sig`;
}

describe("bootstrapSession", () => {
	beforeEach(() => {
		useAuthStore.getState().reset();
		setAccessToken(null);
	});

	afterEach(() => {
		useAuthStore.getState().reset();
		setAccessToken(null);
	});

	it("bootstraps session successfully when refresh returns valid JWT", async () => {
		const token = createJwt({
			sub: "usr-student-1",
			role: "STUDENT",
			email: "alex@nodus.edu",
			firstName: "Alex",
			lastName: "Learner",
		});

		server.use(
			http.post("*/api/auth/refresh", () =>
				HttpResponse.json({ accessToken: token }),
			),
		);

		const result = await bootstrapSession();

		expect(result).toEqual({
			user: {
				id: "usr-student-1",
				role: "student",
				name: "Alex Learner",
				email: "alex@nodus.edu",
			},
			isLoading: false,
			isAuthenticated: true,
		});

		expect(useAuthStore.getState()).toMatchObject({
			status: "authenticated",
			user: {
				id: "usr-student-1",
				role: "student",
				name: "Alex Learner",
				email: "alex@nodus.edu",
			},
		});
	});

	it("returns unauthenticated context when refresh token is missing or invalid (401)", async () => {
		server.use(
			http.post("*/api/auth/refresh", () =>
				HttpResponse.json(
					{
						message: "Refresh token is missing, invalid, revoked, or expired.",
					},
					{ status: 401 },
				),
			),
		);

		const result = await bootstrapSession();

		expect(result).toEqual({
			user: null,
			isLoading: false,
			isAuthenticated: false,
		});

		expect(useAuthStore.getState()).toMatchObject({
			status: "unauthenticated",
			user: null,
		});
	});

	it("treats network failure during refresh as unauthenticated", async () => {
		server.use(http.post("*/api/auth/refresh", () => HttpResponse.error()));

		const result = await bootstrapSession();

		expect(result).toEqual({
			user: null,
			isLoading: false,
			isAuthenticated: false,
		});

		expect(useAuthStore.getState()).toMatchObject({
			status: "unauthenticated",
			user: null,
		});
	});

	it("deduplicates concurrent bootstrapSession calls to a single network request", async () => {
		let refreshCalls = 0;
		const token = createJwt({
			sub: "usr-concurrent",
			role: "LECTURER",
			firstName: "Dr. Elena",
			lastName: "Rostova",
		});

		server.use(
			http.post("*/api/auth/refresh", async () => {
				refreshCalls += 1;
				await new Promise((resolve) => setTimeout(resolve, 30));
				return HttpResponse.json({ accessToken: token });
			}),
		);

		const [first, second] = await Promise.all([
			bootstrapSession(),
			bootstrapSession(),
		]);

		expect(first).toEqual(second);
		expect(first.isAuthenticated).toBe(true);
		expect(first.user?.role).toBe("lecturer");
		expect(refreshCalls).toBe(1);
	});
});
