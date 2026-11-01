import type { AuthUser, UserRole } from "@/stores/auth.store";

export interface BackendJwtClaims {
	sub: string;
	role: "STUDENT" | "LECTURER" | "ADMIN" | "student" | "lecturer" | "admin";
	email?: string;
	firstName?: string;
	lastName?: string;
	exp?: number;
	iat?: number;
}

interface CachedProfile {
	name?: string;
	email?: string;
}

const PROFILE_CACHE_KEY = "nodus_user_profiles";

export function getCachedProfile(userId: string): CachedProfile | null {
	if (typeof localStorage === "undefined") return null;
	try {
		const raw = localStorage.getItem(PROFILE_CACHE_KEY);
		if (!raw) return null;
		const profiles = JSON.parse(raw) as Record<string, CachedProfile>;
		return profiles[userId] ?? null;
	} catch {
		return null;
	}
}

export function cacheUserProfile(userId: string, profile: CachedProfile): void {
	if (typeof localStorage === "undefined") return;
	try {
		const raw = localStorage.getItem(PROFILE_CACHE_KEY);
		const profiles = raw
			? (JSON.parse(raw) as Record<string, CachedProfile>)
			: {};
		profiles[userId] = { ...profiles[userId], ...profile };
		localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profiles));
	} catch {}
}

function decodeBase64Url(segment: string): string {
	const base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
	const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
	const binaryString = atob(padded);
	const bytes = Uint8Array.from(binaryString, (char) => char.charCodeAt(0));
	return new TextDecoder().decode(bytes);
}

export function decodeJwtClaims(token: string): BackendJwtClaims {
	if (!token || typeof token !== "string") {
		throw new Error("Invalid JWT token: token must be a non-empty string");
	}

	const segments = token.split(".");
	if (segments.length !== 3) {
		throw new Error("Invalid JWT token structure: expected 3 segments");
	}

	const payloadSegment = segments[1];
	if (!payloadSegment) {
		throw new Error("Invalid JWT token structure: missing payload segment");
	}

	try {
		const jsonString = decodeBase64Url(payloadSegment);
		const parsed: unknown = JSON.parse(jsonString);
		if (typeof parsed !== "object" || parsed === null) {
			throw new Error("Invalid JWT payload: expected an object");
		}
		const claims = parsed as Record<string, unknown>;
		if (typeof claims.sub !== "string") {
			throw new Error("Invalid JWT payload: missing or invalid sub claim");
		}

		return {
			sub: claims.sub,
			role: (claims.role as BackendJwtClaims["role"]) ?? "STUDENT",
			email: typeof claims.email === "string" ? claims.email : undefined,
			firstName:
				typeof claims.firstName === "string" ? claims.firstName : undefined,
			lastName:
				typeof claims.lastName === "string" ? claims.lastName : undefined,
			exp: typeof claims.exp === "number" ? claims.exp : undefined,
			iat: typeof claims.iat === "number" ? claims.iat : undefined,
		};
	} catch (err) {
		if (err instanceof Error && err.message.startsWith("Invalid JWT")) {
			throw err;
		}
		throw new Error(
			`Failed to decode JWT claims: ${err instanceof Error ? err.message : String(err)}`,
		);
	}
}

export function buildAuthUser(
	claims: BackendJwtClaims,
	fallbackEmail?: string,
): AuthUser {
	const cached = getCachedProfile(claims.sub);
	const email = claims.email || fallbackEmail || cached?.email || "";
	const fullName = [claims.firstName, claims.lastName]
		.filter(Boolean)
		.join(" ")
		.trim();
	const name = fullName || cached?.name || (email ? email.split("@")[0] : "");

	const rawRole = (claims.role ?? "STUDENT").toLowerCase();
	const role: UserRole =
		rawRole === "lecturer"
			? "lecturer"
			: rawRole === "admin"
				? "admin"
				: "student";

	return {
		id: claims.sub,
		role,
		name,
		email,
	};
}

export function isTokenExpiringSoon(
	token: string,
	thresholdSeconds = 30,
): boolean {
	try {
		const claims = decodeJwtClaims(token);
		if (typeof claims.exp !== "number") {
			return false;
		}
		const expiryMs = claims.exp * 1000;
		return expiryMs - Date.now() <= thresholdSeconds * 1000;
	} catch {
		return false;
	}
}
