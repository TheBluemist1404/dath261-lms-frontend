import { redirect } from "@tanstack/react-router";
import type { RouterAuthContext } from "@/features/auth/types";
import type { AuthUser, UserRole } from "@/stores/auth.store";
import { useAuthStore } from "@/stores/auth.store";

export interface GuardContext {
	auth?: RouterAuthContext;
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

	let decoded = trimmed;
	try {
		for (let i = 0; i < 3; i++) {
			const next = decodeURIComponent(decoded);
			if (next === decoded) break;
			decoded = next;
		}
	} catch {
		return fallback;
	}

	if (
		!decoded.startsWith("/") ||
		decoded.startsWith("//") ||
		decoded.includes("\\")
	) {
		return fallback;
	}

	if (
		decoded === "/login" ||
		decoded === "/register" ||
		decoded.startsWith("/login?") ||
		decoded.startsWith("/register?") ||
		decoded.startsWith("/login#") ||
		decoded.startsWith("/register#")
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
	const auth = context?.auth ?? {
		user: useAuthStore.getState().user,
		isAuthenticated: useAuthStore.getState().status === "authenticated",
		isLoading: useAuthStore.getState().status === "loading",
	};

	if (auth.isLoading || !auth.isAuthenticated || !auth.user) {
		throw redirect({
			to: "/login",
			search: {
				redirect: sanitizeRedirect(location.href, "/"),
			},
		});
	}

	return {
		user: auth.user,
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
	const auth = context?.auth ?? {
		user: useAuthStore.getState().user,
		isAuthenticated: useAuthStore.getState().status === "authenticated",
		isLoading: useAuthStore.getState().status === "loading",
	};

	if (auth.isAuthenticated) {
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
