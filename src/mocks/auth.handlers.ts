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
	email: string = "alex@example.com",
	firstName: string = "Alex",
	lastName: string = "Le",
) {
	const header = base64Url(JSON.stringify({ alg: "none", typ: "JWT" }));
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
	return `${header}.${payload}.mock`;
}

// Mirrors the backend auth module: tokens in the body, refresh via cookie.
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
				{ message: "Invalid email or password." },
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

		return HttpResponse.json({
			accessToken: createMockAccessToken(
				mockUsers.alex.id,
				"STUDENT",
				body.email,
				"Alex",
				"Le",
			),
		});
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

		return HttpResponse.json(
			{
				user: {
					id: `usr-${Date.now()}`,
					email: body.email,
					role: body.role,
					firstName: body.firstName,
					lastName: body.lastName,
					status: "ACTIVE",
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
				},
			},
			{ status: 201 },
		);
	}),
	http.post("*/api/auth/refresh", () =>
		HttpResponse.json({ accessToken: createMockAccessToken() }),
	),
	http.post("*/api/auth/logout", () => new HttpResponse(null, { status: 204 })),
];
