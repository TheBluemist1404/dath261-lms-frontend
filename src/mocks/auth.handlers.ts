import { HttpResponse, http } from "msw";
import { mockUsers } from "@/features/workspace/testing/mock-db";

type BackendRole = "STUDENT" | "LECTURER" | "ADMIN";

function base64Url(value: string) {
	const bytes = new TextEncoder().encode(value);
	return btoa(String.fromCharCode(...bytes))
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/, "");
}

/** Builds an unsigned token with the same claims the backend signs. */
export function createMockAccessToken(
	userId: string = mockUsers.alex.id,
	role: BackendRole = "STUDENT",
) {
	const header = base64Url(JSON.stringify({ alg: "none", typ: "JWT" }));
	const payload = base64Url(JSON.stringify({ sub: userId, role }));
	return `${header}.${payload}.mock`;
}

// Mirrors the backend auth module: tokens in the body, refresh via cookie.
export const authHandlers = [
	http.post("*/api/auth/login", () =>
		HttpResponse.json({ accessToken: createMockAccessToken() }),
	),
	http.post("*/api/auth/refresh", () =>
		HttpResponse.json({ accessToken: createMockAccessToken() }),
	),
	http.post("*/api/auth/logout", () => new HttpResponse(null, { status: 204 })),
];
