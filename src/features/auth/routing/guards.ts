import { redirect } from "@tanstack/react-router";
import type { RouterAuthContext } from "@/features/auth/types";
import type { AuthUser, UserRole } from "@/stores/auth.store";

export interface GuardContext {
	auth: RouterAuthContext;
}

export interface GuardLocation {
	href: string;
}

export function sanitizeRedirect(url?: string | null, fallback = "/"): string {
	if (!url || typeof url !== "string") {
		return fallback;
	}

	const trimmed = url.trim();
	if (
		!trimmed.startsWith("/") ||
		trimmed.startsWith("//") ||
		trimmed.includes("\\")
	) {
		return fallback;
	}

	if (
		trimmed === "/login" ||
		trimmed === "/register" ||
		trimmed.startsWith("/login?") ||
		trimmed.startsWith("/register?") ||
		trimmed.startsWith("/login#") ||
		trimmed.startsWith("/register#")
	) {
		return fallback;
	}

	return trimmed;
}

export function hasRole(
	user: AuthUser | null | undefined,
	role: UserRole,
): boolean {
	return user?.role === role;
}

export function hasAnyRole(
	user: AuthUser | null | undefined,
	roles: readonly UserRole[],
): boolean {
	return user != null && roles.includes(user.role);
}

export function requireAuth({
	context,
	location,
}: {
	context: GuardContext;
	location: GuardLocation;
}): { user: AuthUser } {
	if (!context.auth.isAuthenticated || !context.auth.user) {
		throw redirect({
			to: "/login",
			search: {
				redirect: sanitizeRedirect(location.href, "/"),
			},
		});
	}

	return {
		user: context.auth.user,
	};
}

export function requireGuest({
	context,
	search,
}: {
	context: GuardContext;
	search?: {
		redirect?: string;
	};
}): void {
	if (context.auth.isAuthenticated) {
		const target = sanitizeRedirect(search?.redirect, "/");
		throw redirect({
			to: target,
		});
	}
}

export function requireRole(
	allowedRoles: UserRole | readonly UserRole[],
	fallback = "/",
) {
	const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

	return ({
		context,
		location,
	}: {
		context: GuardContext;
		location: GuardLocation;
	}): { user: AuthUser } => {
		const authResult = requireAuth({ context, location });

		if (!roles.includes(authResult.user.role)) {
			throw redirect({
				to: fallback,
			});
		}

		return authResult;
	};
}
