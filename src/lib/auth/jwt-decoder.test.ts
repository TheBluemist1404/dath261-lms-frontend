import { beforeEach, describe, expect, it } from "vitest";
import {
	buildAuthUser,
	cacheUserProfile,
	decodeJwtClaims,
	getCachedProfile,
	isTokenExpiringSoon,
} from "./jwt-decoder";

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

describe("decodeJwtClaims", () => {
	it("decodes a full payload with sub, role, email, names, and timestamps", () => {
		const token = createJwt({
			sub: "usr-123",
			role: "STUDENT",
			email: "alex@nodus.edu",
			firstName: "Alex",
			lastName: "Learner",
			exp: 1735689600,
			iat: 1735686000,
		});

		const claims = decodeJwtClaims(token);
		expect(claims).toEqual({
			sub: "usr-123",
			role: "STUDENT",
			email: "alex@nodus.edu",
			firstName: "Alex",
			lastName: "Learner",
			exp: 1735689600,
			iat: 1735686000,
		});
	});

	it("decodes a minimal payload with only sub and role", () => {
		const token = createJwt({
			sub: "usr-456",
			role: "LECTURER",
		});

		const claims = decodeJwtClaims(token);
		expect(claims.sub).toBe("usr-456");
		expect(claims.role).toBe("LECTURER");
		expect(claims.email).toBeUndefined();
		expect(claims.exp).toBeUndefined();
	});

	it("decodes UTF-8 strings correctly in names", () => {
		const token = createJwt({
			sub: "usr-vn",
			role: "STUDENT",
			firstName: "Nguyễn",
			lastName: "Văn An",
		});

		const claims = decodeJwtClaims(token);
		expect(claims.firstName).toBe("Nguyễn");
		expect(claims.lastName).toBe("Văn An");
	});

	it("throws on tokens with invalid segment counts", () => {
		expect(() => decodeJwtClaims("not-a-jwt")).toThrow(
			"Invalid JWT token structure",
		);
		expect(() => decodeJwtClaims("header.payload")).toThrow(
			"Invalid JWT token structure",
		);
		expect(() => decodeJwtClaims("a.b.c.d")).toThrow(
			"Invalid JWT token structure",
		);
	});

	it("throws on empty or non-string input", () => {
		expect(() => decodeJwtClaims("")).toThrow("Invalid JWT token");
	});

	it("throws on payloads missing sub", () => {
		const token = createJwt({ role: "STUDENT" });
		expect(() => decodeJwtClaims(token)).toThrow(
			"Invalid JWT payload: missing or invalid sub claim",
		);
	});

	it("throws on malformed JSON payload", () => {
		const badToken = "header.bm90LWpzb24.sig";
		expect(() => decodeJwtClaims(badToken)).toThrow(
			"Failed to decode JWT claims",
		);
	});
});

describe("buildAuthUser", () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it("builds an AuthUser from full claims", () => {
		const user = buildAuthUser({
			sub: "usr-1",
			role: "LECTURER",
			email: "elena@nodus.edu",
			firstName: "Dr. Elena",
			lastName: "Rostova",
		});

		expect(user).toEqual({
			id: "usr-1",
			role: "lecturer",
			name: "Dr. Elena Rostova",
			email: "elena@nodus.edu",
		});
	});

	it("maps roles to lowercase user roles", () => {
		expect(buildAuthUser({ sub: "u1", role: "STUDENT" }).role).toBe("student");
		expect(buildAuthUser({ sub: "u2", role: "LECTURER" }).role).toBe(
			"lecturer",
		);
		expect(buildAuthUser({ sub: "u3", role: "ADMIN" }).role).toBe("admin");
	});

	it("falls back to email prefix when names are missing", () => {
		const user = buildAuthUser({
			sub: "usr-2",
			role: "STUDENT",
			email: "student@nodus.edu",
		});

		expect(user.name).toBe("student");
		expect(user.email).toBe("student@nodus.edu");
	});

	it("falls back to fallbackEmail when claims have no email", () => {
		const user = buildAuthUser(
			{
				sub: "usr-3",
				role: "STUDENT",
			},
			"login@nodus.edu",
		);

		expect(user.email).toBe("login@nodus.edu");
		expect(user.name).toBe("login");
	});

	it("uses cached profile data when available", () => {
		cacheUserProfile("usr-cached", {
			name: "Cached Name",
			email: "cached@nodus.edu",
		});

		const user = buildAuthUser({
			sub: "usr-cached",
			role: "STUDENT",
		});

		expect(user.name).toBe("Cached Name");
		expect(user.email).toBe("cached@nodus.edu");
	});

	it("returns empty string for name and email when no information is available", () => {
		const user = buildAuthUser({
			sub: "usr-none",
			role: "STUDENT",
		});

		expect(user.name).toBe("");
		expect(user.email).toBe("");
	});
});

describe("isTokenExpiringSoon", () => {
	it("returns true when token expires in less than 30 seconds", () => {
		const expiringToken = createJwt({
			sub: "usr-1",
			role: "STUDENT",
			exp: Math.floor(Date.now() / 1000) + 15,
		});

		expect(isTokenExpiringSoon(expiringToken, 30)).toBe(true);
	});

	it("returns true when token is already expired", () => {
		const expiredToken = createJwt({
			sub: "usr-1",
			role: "STUDENT",
			exp: Math.floor(Date.now() / 1000) - 10,
		});

		expect(isTokenExpiringSoon(expiredToken, 30)).toBe(true);
	});

	it("returns false when token expires well in the future", () => {
		const freshToken = createJwt({
			sub: "usr-1",
			role: "STUDENT",
			exp: Math.floor(Date.now() / 1000) + 3600,
		});

		expect(isTokenExpiringSoon(freshToken, 30)).toBe(false);
	});

	it("returns false when token lacks exp claim", () => {
		const noExpToken = createJwt({
			sub: "usr-1",
			role: "STUDENT",
		});

		expect(isTokenExpiringSoon(noExpToken, 30)).toBe(false);
	});

	it("returns false for invalid token strings", () => {
		expect(isTokenExpiringSoon("invalid-token")).toBe(false);
	});
});

describe("cacheUserProfile", () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it("persists and retrieves profile entries by user ID", () => {
		cacheUserProfile("u-1", { name: "User One", email: "one@nodus.edu" });
		expect(getCachedProfile("u-1")).toEqual({
			name: "User One",
			email: "one@nodus.edu",
		});
		expect(getCachedProfile("u-unknown")).toBeNull();
	});
});
