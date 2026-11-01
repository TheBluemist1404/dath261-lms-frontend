import { act, renderHook } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getAccessToken, setAccessToken } from "@/lib/auth/access-token";
import { useAuthStore } from "@/stores/auth.store";
import { server } from "@/test/mocks/server";
import { useAuth } from "./use-auth";

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

describe("useAuth", () => {
	beforeEach(() => {
		useAuthStore.getState().reset();
		setAccessToken(null);
	});

	afterEach(() => {
		useAuthStore.getState().reset();
		setAccessToken(null);
	});

	it("reflects store status and unauthenticated user by default", () => {
		useAuthStore.getState().clearAuth();
		const { result } = renderHook(() => useAuth());

		expect(result.current.user).toBeNull();
		expect(result.current.status).toBe("unauthenticated");
		expect(result.current.isLoading).toBe(false);
		expect(result.current.isAuthenticated).toBe(false);
	});

	it("authenticates user and stores in-memory token on successful login", async () => {
		const token = createJwt({
			sub: "usr-student-42",
			role: "STUDENT",
			email: "alex@nodus.edu",
			firstName: "Alex",
			lastName: "Learner",
		});

		server.use(
			http.post("*/api/auth/login", () =>
				HttpResponse.json({ accessToken: token }),
			),
		);

		const { result } = renderHook(() => useAuth());

		await act(async () => {
			await result.current.login({
				email: "alex@nodus.edu",
				password: "Password123!",
			});
		});

		expect(getAccessToken()).toBe(token);
		expect(result.current.isAuthenticated).toBe(true);
		expect(result.current.status).toBe("authenticated");
		expect(result.current.user).toEqual({
			id: "usr-student-42",
			role: "student",
			name: "Alex Learner",
			email: "alex@nodus.edu",
		});
	});

	it("does not mutate auth store or grant session upon registration (zombie session prevention)", async () => {
		useAuthStore.getState().clearAuth();

		server.use(
			http.post("*/api/auth/register", () =>
				HttpResponse.json(
					{
						user: {
							id: "cm123-new-user",
							email: "new@nodus.edu",
							role: "STUDENT",
							status: "ACTIVE",
							firstName: "New",
							lastName: "Learner",
							createdAt: "2026-11-01T00:00:00.000Z",
							updatedAt: "2026-11-01T00:00:00.000Z",
						},
					},
					{ status: 201 },
				),
			),
		);

		const { result } = renderHook(() => useAuth());

		let registerResult: unknown;
		await act(async () => {
			registerResult = await result.current.register({
				fullName: "New Learner",
				email: "new@nodus.edu",
				password: "Password123!",
				role: "student",
			});
		});

		expect(registerResult).toEqual({
			user: expect.objectContaining({
				id: "cm123-new-user",
				email: "new@nodus.edu",
			}),
		});

		expect(getAccessToken()).toBeNull();
		expect(result.current.isAuthenticated).toBe(false);
		expect(result.current.status).toBe("unauthenticated");
		expect(result.current.user).toBeNull();
	});

	it("clears token and resets auth store on logout", async () => {
		const token = createJwt({
			sub: "usr-to-logout",
			role: "STUDENT",
			email: "alex@nodus.edu",
		});
		setAccessToken(token);
		useAuthStore.getState().setUser({
			id: "usr-to-logout",
			role: "student",
			name: "Alex",
			email: "alex@nodus.edu",
		});

		let logoutCalled = false;
		server.use(
			http.post("*/api/auth/logout", () => {
				logoutCalled = true;
				return new HttpResponse(null, { status: 204 });
			}),
		);

		const { result } = renderHook(() => useAuth());
		expect(result.current.isAuthenticated).toBe(true);

		await act(async () => {
			await result.current.logout();
		});

		expect(logoutCalled).toBe(true);
		expect(getAccessToken()).toBeNull();
		expect(result.current.isAuthenticated).toBe(false);
		expect(result.current.status).toBe("unauthenticated");
		expect(result.current.user).toBeNull();
	});
});
