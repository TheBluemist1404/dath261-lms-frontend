import type { UserRole } from "@/stores/auth.store";
import { decodeJwtClaims } from "./jwt-decoder";

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
	student: "student",
	lecturer: "lecturer",
	admin: "admin",
};

export function readAccessTokenClaims(token: string): AccessTokenClaims | null {
	try {
		const claims = decodeJwtClaims(token);
		if (!claims.sub || !claims.role) return null;
		const userRole = backendRoles[claims.role];
		return userRole ? { userId: claims.sub, role: userRole } : null;
	} catch {
		return null;
	}
}
