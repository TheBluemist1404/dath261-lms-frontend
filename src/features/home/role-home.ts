import { redirect } from "@tanstack/react-router";
import type { GuardContext } from "@/features/auth/routing/guards";
import type { UserRole } from "@/stores/auth.store";

// Students land in their workspaces until the dashboard (Week 47) exists.
const roleHomes = {
	student: "/workspace",
	lecturer: "/instructor/courses",
	admin: "/admin",
} as const satisfies Record<UserRole, string>;

export function roleHome(role: UserRole) {
	return roleHomes[role];
}

/** The landing page is for signed-out visitors; send everyone else home. */
export function redirectSignedInHome({ context }: { context: GuardContext }) {
	const user = context.auth?.isAuthenticated ? context.auth.user : null;
	if (user) {
		throw redirect({ to: roleHome(user.role), replace: true });
	}
}
