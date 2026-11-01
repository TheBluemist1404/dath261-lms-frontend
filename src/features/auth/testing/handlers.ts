import { HttpResponse, http } from "msw";
import type {
	AuthTokenResponseDto,
	AuthUser,
	LoginCredentials,
	RegisterDto,
	RegisterResponseDto,
} from "../types";
import { mockStudent } from "./fixtures";

let activeMockUser: AuthUser | null = null;

export function setMockCurrentUser(user: AuthUser | null): void {
	activeMockUser = user;
}

export function resetMockAuth(): void {
	activeMockUser = null;
}

function base64Url(value: string): string {
	const bytes = new TextEncoder().encode(value);
	return btoa(String.fromCharCode(...bytes))
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/, "");
}

function createMockJwt(claims: Record<string, unknown>): string {
	const header = base64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
	const payload = base64Url(
		JSON.stringify({
			exp: Math.floor(Date.now() / 1000) + 3600,
			iat: Math.floor(Date.now() / 1000),
			...claims,
		}),
	);
	return `${header}.${payload}.mock-signature`;
}

export const authHandlers = [
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

		if (
			body.email === "suspended@nodus.edu" ||
			body.email === "suspended@example.com"
		) {
			return HttpResponse.json(
				{ message: "The account is suspended." },
				{ status: 403 },
			);
		}

		const user = activeMockUser ?? {
			...mockStudent,
			email: body.email,
		};

		const accessToken = createMockJwt({
			sub: user.id,
			email: user.email,
			role: user.role.toUpperCase(),
			firstName: user.name.split(" ")[0] ?? "Alex",
			lastName: user.name.split(" ").slice(1).join(" ") ?? "Learner",
		});

		const response: AuthTokenResponseDto = { accessToken };

		return HttpResponse.json(response, {
			headers: {
				"Set-Cookie":
					"refresh_token=mock-valid-refresh-token; Path=/api/auth; HttpOnly; SameSite=Lax",
			},
		});
	}),

	http.post("/api/auth/register", async ({ request }) => {
		const body = (await request.json()) as RegisterDto;

		if (body.email === "exists@example.com") {
			return HttpResponse.json(
				{ message: "An account with this email already exists." },
				{ status: 409 },
			);
		}

		if (
			!body.email ||
			!body.password ||
			!body.role ||
			!body.firstName ||
			!body.lastName
		) {
			return HttpResponse.json(
				{ message: "Invalid request body." },
				{ status: 400 },
			);
		}

		if (body.password.length < 8 || body.password.length > 72) {
			return HttpResponse.json(
				{ message: "Password must be between 8 and 72 characters." },
				{ status: 400 },
			);
		}

		if (body.role !== "STUDENT" && body.role !== "LECTURER") {
			return HttpResponse.json(
				{ message: "Role must be STUDENT or LECTURER." },
				{ status: 400 },
			);
		}

		const registerResponse: RegisterResponseDto = {
			user: {
				id: `cm123-${Date.now()}`,
				email: body.email,
				role: body.role,
				status: "ACTIVE",
				firstName: body.firstName,
				lastName: body.lastName,
				createdAt: "2026-11-01T00:00:00.000Z",
				updatedAt: "2026-11-01T00:00:00.000Z",
			},
		};

		return HttpResponse.json(registerResponse, {
			status: 201,
		});
	}),

	http.post("/api/auth/refresh", ({ cookies }) => {
		const refreshToken = cookies.refresh_token;

		if (refreshToken === "invalid-token" || refreshToken === "missing") {
			return HttpResponse.json(
				{ message: "Refresh token is missing, invalid, revoked, or expired." },
				{ status: 401 },
			);
		}

		if (refreshToken === "suspended-token") {
			return HttpResponse.json(
				{ message: "The account is suspended." },
				{ status: 403 },
			);
		}

		const user = activeMockUser ?? mockStudent;
		const accessToken = createMockJwt({
			sub: user.id,
			email: user.email,
			role: user.role.toUpperCase(),
			firstName: user.name.split(" ")[0] ?? "Alex",
			lastName: user.name.split(" ").slice(1).join(" ") ?? "Learner",
		});

		const response: AuthTokenResponseDto = { accessToken };

		return HttpResponse.json(response, {
			headers: {
				"Set-Cookie":
					"refresh_token=mock-rotated-refresh-token; Path=/api/auth; HttpOnly; SameSite=Lax",
			},
		});
	}),

	http.post("/api/auth/logout", () => {
		activeMockUser = null;
		return new HttpResponse(null, {
			status: 204,
			headers: {
				"Set-Cookie":
					"refresh_token=; Path=/api/auth; Max-Age=0; HttpOnly; SameSite=Lax",
			},
		});
	}),
];
