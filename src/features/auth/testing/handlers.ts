import { HttpResponse, http } from "msw";
import type { AuthUser, LoginCredentials, RegisterPayload } from "../types";
import { mockStudent } from "./fixtures";

let activeMockUser: AuthUser | null = null;

export function setMockCurrentUser(user: AuthUser | null): void {
	activeMockUser = user;
}

export function resetMockAuth(): void {
	activeMockUser = null;
}

export const authHandlers = [
	http.get("/api/auth/me", () => {
		if (!activeMockUser) {
			return HttpResponse.json({ message: "Unauthenticated" }, { status: 401 });
		}

		return HttpResponse.json({
			user: activeMockUser,
		});
	}),

	http.post("/api/auth/login", async ({ request }) => {
		const body = (await request.json()) as LoginCredentials;

		if (
			body.email === "invalid@example.com" ||
			body.password === "wrong-password"
		) {
			return HttpResponse.json(
				{ message: "Invalid email or password" },
				{ status: 401 },
			);
		}

		const user: AuthUser = {
			...mockStudent,
			email: body.email,
		};
		activeMockUser = user;

		return HttpResponse.json(
			{ user },
			{
				headers: {
					"Set-Cookie": "nodus_session=valid-test-cookie; Path=/; HttpOnly",
				},
			},
		);
	}),

	http.post("/api/auth/register", async ({ request }) => {
		const body = (await request.json()) as RegisterPayload;

		if (body.email === "exists@example.com") {
			return HttpResponse.json(
				{ message: "Email already registered" },
				{ status: 409 },
			);
		}

		const user: AuthUser = {
			id: `registered-${Date.now()}`,
			name: body.name,
			email: body.email,
			role: body.role,
		};
		activeMockUser = user;

		return HttpResponse.json(
			{ user },
			{
				status: 201,
				headers: {
					"Set-Cookie": "nodus_session=valid-test-cookie; Path=/; HttpOnly",
				},
			},
		);
	}),

	http.post("/api/auth/logout", () => {
		activeMockUser = null;
		return HttpResponse.json(
			{ message: "Logged out successfully" },
			{
				headers: {
					"Set-Cookie": "nodus_session=; Path=/; Max-Age=0",
				},
			},
		);
	}),
];
