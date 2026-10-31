import type { AuthState } from "@/stores/auth.store";

export type AdminAccess =
	| "pending"
	| "unauthenticated"
	| "forbidden"
	| "granted";

// UX gate only; the backend must still authorize every admin operation.
export function getAdminAccess(auth: AuthState): AdminAccess {
	if (auth.status === "loading") return "pending";
	if (auth.status === "unauthenticated") return "unauthenticated";
	return auth.user.role === "admin" ? "granted" : "forbidden";
}
