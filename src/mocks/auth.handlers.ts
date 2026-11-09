import { HttpResponse, http } from "msw";
import { mockUsers } from "@/features/workspace/testing/mock-db";

type BackendRole = "STUDENT" | "LECTURER" | "ADMIN";

export interface MockAuthUser {
	id: string;
	email: string;
	role: string;
	name?: string;
	firstName?: string;
	lastName?: string;
}

export const mockStudent: MockAuthUser = {
	id: mockUsers.alex.id,
	name: "Alex Learner",
	email: "alex@nodus.edu",
	role: "student",
	firstName: "Alex",
	lastName: "Learner",
};

export const mockLecturer: MockAuthUser = {
	id: "lecturer-1",
	name: "Dr. Elena Rostova",
	email: "elena@nodus.edu",
	role: "lecturer",
	firstName: "Elena",
	lastName: "Rostova",
};

export const mockAdmin: MockAuthUser = {
	id: "admin-1",
	name: "System Admin",
	email: "admin@nodus.edu",
	role: "admin",
	firstName: "System",
	lastName: "Admin",
};

let activeMockUser: MockAuthUser | null = null;
let isMockAuthenticated = false;

export function setMockCurrentUser(user: MockAuthUser | null): void {
	activeMockUser = user;
}

export function resetMockAuth(): void {
	activeMockUser = null;
	isMockAuthenticated = false;
	if (typeof window !== "undefined") {
		const win = window as unknown as {
			_document?: { _cookieJar?: { removeAllCookiesSync?: () => void } };
		};
		win._document?._cookieJar?.removeAllCookiesSync?.();
	}
	if (typeof localStorage !== "undefined") {
		localStorage.removeItem("__msw-cookie-store__");
	}
}

function base64Url(value: string) {
	const bytes = new TextEncoder().encode(value);
	return btoa(String.fromCharCode(...bytes))
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/, "");
}

export function createMockAccessToken(
	userId: string = mockUsers.alex.id,
	role: BackendRole = "STUDENT",
	email: string = "alex@example.com",
	firstName: string = "Alex",
	lastName: string = "Le",
) {
	const header = base64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
	const payload = base64Url(
		JSON.stringify({
			sub: userId,
			role,
			email,
			firstName,
			lastName,
			exp: Math.floor(Date.now() / 1000) + 3600,
			iat: Math.floor(Date.now() / 1000),
		}),
	);
	return `${header}.${payload}.mock-signature`;
}

function extractRefreshToken(
	cookieHeader: string | null,
	cookies: Record<string, string>,
	isAuthenticated: boolean,
): string | null {
	if (cookieHeader) {
		const parts = cookieHeader.split(";").map((p) => p.trim());
		const firstToken = parts[0]?.match(/^refresh_token=([^;]+)/)?.[1] ?? null;
		if (firstToken) {
			const secondPart = parts[1]?.toLowerCase() ?? "";
			const isFirstTokenStoredResponseCookie =
				secondPart.startsWith("path=") ||
				secondPart === "httponly" ||
				secondPart.startsWith("samesite=");

			if (isFirstTokenStoredResponseCookie && !isAuthenticated) {
				return null;
			}
			return firstToken;
		}
	}

	if (cookies?.refresh_token) {
		return cookies.refresh_token;
	}

	if (typeof window !== "undefined" && !navigator.userAgent.includes("jsdom")) {
		const isTombstoned =
			localStorage.getItem("nodus_logout_tombstone") === "true";
		if (isTombstoned) {
			return null;
		}
		return "mock-browser-refresh-token";
	}

	return isAuthenticated ? "mock-node-refresh-token" : null;
}

export const authHandlers = [
	http.post("*/api/auth/login", async ({ request }) => {
		const body = (await request.json().catch(() => null)) as {
			email?: string;
			password?: string;
		} | null;

		if (!body?.email || !body?.password) {
			return HttpResponse.json(
				{ message: "Invalid request body." },
				{ status: 400 },
			);
		}

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
		const userRole = (user.role.toUpperCase() as BackendRole) || "STUDENT";
		const firstName =
			user.firstName ?? (user.name ? user.name.split(" ")[0] : "Alex");
		const lastName =
			user.lastName ??
			(user.name ? user.name.split(" ").slice(1).join(" ") : "Learner");

		const accessToken = createMockAccessToken(
			user.id,
			userRole,
			user.email,
			firstName,
			lastName,
		);

		isMockAuthenticated = true;

		return HttpResponse.json(
			{ accessToken },
			{
				headers: {
					"Set-Cookie":
						"refresh_token=mock-valid-refresh-token; Path=/api/auth; HttpOnly; SameSite=Lax",
				},
			},
		);
	}),

	http.post("*/api/auth/register", async ({ request }) => {
		const body = (await request.json().catch(() => null)) as {
			email?: string;
			password?: string;
			role?: string;
			firstName?: string;
			lastName?: string;
		} | null;

		if (body?.email === "exists@example.com") {
			return HttpResponse.json(
				{ message: "An account with this email already exists." },
				{ status: 409 },
			);
		}

		if (
			!body?.email ||
			!body?.password ||
			!body?.role ||
			!body?.firstName ||
			!body?.lastName
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

		return HttpResponse.json(
			{
				user: {
					id: `cm123-${Date.now()}`,
					email: body.email,
					role: body.role,
					firstName: body.firstName,
					lastName: body.lastName,
					status: "ACTIVE",
					createdAt: "2026-11-01T00:00:00.000Z",
					updatedAt: "2026-11-01T00:00:00.000Z",
				},
			},
			{ status: 201 },
		);
	}),

	http.post("*/api/auth/refresh", ({ cookies, request }) => {
		const cookieHeader = request.headers.get("cookie");
		const refreshToken = extractRefreshToken(
			cookieHeader,
			cookies as Record<string, string>,
			isMockAuthenticated,
		);

		if (
			!refreshToken ||
			refreshToken === "invalid-token" ||
			refreshToken === "missing"
		) {
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

		isMockAuthenticated = true;

		const user = activeMockUser ?? mockStudent;
		const userRole = (user.role.toUpperCase() as BackendRole) || "STUDENT";
		const firstName =
			user.firstName ?? (user.name ? user.name.split(" ")[0] : "Alex");
		const lastName =
			user.lastName ??
			(user.name ? user.name.split(" ").slice(1).join(" ") : "Learner");

		const accessToken = createMockAccessToken(
			user.id,
			userRole,
			user.email,
			firstName,
			lastName,
		);

		return HttpResponse.json(
			{ accessToken },
			{
				headers: {
					"Set-Cookie":
						"refresh_token=mock-rotated-refresh-token; Path=/api/auth; HttpOnly; SameSite=Lax",
				},
			},
		);
	}),

	http.post("*/api/auth/logout", () => {
		activeMockUser = null;
		isMockAuthenticated = false;
		return new HttpResponse(null, {
			status: 204,
			headers: {
				"Set-Cookie":
					"refresh_token=; Path=/api/auth; Max-Age=0; HttpOnly; SameSite=Lax",
			},
		});
	}),
];
