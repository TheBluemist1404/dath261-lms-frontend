import type { UserRole } from "@/stores/auth.store";

// The backend returns a short-lived access token in the response body and keeps the
// refresh token in an HttpOnly cookie. Hold the access token in memory only.
let accessToken: string | null = null;

export function getAccessToken() {
	return accessToken;
}

export function setAccessToken(token: string | null) {
	accessToken = token;
}

export interface AccessTokenClaims {
	userId: string;
	role: UserRole;
}

const backendRoles: Record<string, UserRole> = {
	STUDENT: "student",
	LECTURER: "lecturer",
	ADMIN: "admin",
};

function decodeBase64Url(segment: string) {
	const base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
	const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
	const bytes = Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
	return new TextDecoder().decode(bytes);
}

/**
 * Reads the `sub` and `role` claims the backend signs into access tokens.
 * The signature is not verified here; the backend remains the authority.
 */
export function readAccessTokenClaims(token: string): AccessTokenClaims | null {
	const payload = token.split(".")[1];
	if (!payload) return null;

	try {
		const claims: unknown = JSON.parse(decodeBase64Url(payload));
		if (typeof claims !== "object" || claims === null) return null;

		const { sub, role } = claims as Record<string, unknown>;
		if (typeof sub !== "string" || typeof role !== "string") return null;

		const userRole = backendRoles[role];
		return userRole ? { userId: sub, role: userRole } : null;
	} catch {
		return null;
	}
}
