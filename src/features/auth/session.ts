import { endSession, refreshAccessToken } from "@/lib/auth/session";
import { useAuthStore } from "@/stores/auth.store";
import type { RouterAuthContext } from "./types";

let activeBootstrapPromise: Promise<RouterAuthContext> | null = null;

export async function bootstrapSession(): Promise<RouterAuthContext> {
	if (activeBootstrapPromise) {
		return activeBootstrapPromise;
	}

	activeBootstrapPromise = (async () => {
		try {
			const token = await refreshAccessToken();
			if (token) {
				const user = useAuthStore.getState().user;
				return { user, isLoading: false, isAuthenticated: true };
			}
			return { user: null, isLoading: false, isAuthenticated: false };
		} catch {
			endSession();
			return { user: null, isLoading: false, isAuthenticated: false };
		} finally {
			activeBootstrapPromise = null;
		}
	})();

	return activeBootstrapPromise;
}
