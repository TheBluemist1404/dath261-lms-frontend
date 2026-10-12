import { getCurrentUserApi } from "@/features/auth/api/auth.api";
import type { RouterAuthContext } from "@/features/auth/types";
import { useAuthStore } from "@/stores/auth.store";

export async function bootstrapSession(): Promise<RouterAuthContext> {
	const state = useAuthStore.getState();
	if (state.status === "loading") {
		try {
			const user = await getCurrentUserApi();
			useAuthStore.getState().setUser(user);
		} catch {
			useAuthStore.getState().setUser(null);
		}
	}

	const current = useAuthStore.getState();
	return {
		user: current.user,
		isLoading: current.status === "loading",
		isAuthenticated: current.status === "authenticated",
	};
}
