import { setAccessToken } from "@/lib/auth/access-token";
import { broadcastLogout } from "@/lib/auth/cross-tab-sync";
import { invalidateSessionEpoch } from "@/lib/auth/session";
import { httpClient } from "@/lib/http/client";
import { queryClient } from "@/lib/query/client";
import { router } from "@/router";
import { useAuthStore } from "@/stores/auth.store";

export async function terminateSession(): Promise<void> {
	invalidateSessionEpoch();

	try {
		if (typeof window !== "undefined") {
			localStorage.setItem("nodus_logout_tombstone", "true");
		}
	} catch {
		// Ignore localStorage write failures
	}

	setAccessToken(null);
	useAuthStore.getState().clearAuth();
	broadcastLogout();

	try {
		await httpClient.post<void>("/auth/logout", null, {
			skipAuthRefresh: true,
			withCredentials: true,
		});
	} catch {
		// Even if server-side logout fails (e.g. 500 or offline), the client
		// guarantees session termination via tombstone and memory clearing.
	} finally {
		queryClient.clear();
		try {
			await router.invalidate();
		} catch {
			// Router may not be mounted in non-browser environments
		}
	}
}
