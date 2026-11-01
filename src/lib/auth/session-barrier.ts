import type {
	AuthTokenResponseDto,
	RouterAuthContext,
} from "@/features/auth/types";
import { setAccessToken } from "@/lib/auth/access-token";
import { buildAuthUser, decodeJwtClaims } from "@/lib/auth/jwt-decoder";
import { httpClient } from "@/lib/http/client";
import { useAuthStore } from "@/stores/auth.store";

let sessionEpoch = 0;
let activeAbortController: AbortController | null = null;
let activeBootstrapPromise: Promise<RouterAuthContext> | null = null;

export function invalidateSessionEpoch(): number {
	sessionEpoch += 1;
	if (activeAbortController) {
		activeAbortController.abort();
		activeAbortController = null;
	}
	activeBootstrapPromise = null;
	return sessionEpoch;
}

export function getSessionEpoch(): number {
	return sessionEpoch;
}

export function resetSessionBarrierForTest(): void {
	sessionEpoch = 0;
	if (activeAbortController) {
		activeAbortController.abort();
		activeAbortController = null;
	}
	activeBootstrapPromise = null;
}

export function bootstrapSessionSafe(): Promise<RouterAuthContext> {
	try {
		if (
			typeof window !== "undefined" &&
			localStorage.getItem("nodus_logout_tombstone") === "true"
		) {
			setAccessToken(null);
			useAuthStore.getState().clearAuth();
			return Promise.resolve({
				user: null,
				isLoading: false,
				isAuthenticated: false,
			});
		}
	} catch {
		// Ignore localStorage read errors
	}

	const currentAuth = useAuthStore.getState();
	if (currentAuth.status === "authenticated" && currentAuth.user) {
		return Promise.resolve({
			user: currentAuth.user,
			isLoading: false,
			isAuthenticated: true,
		});
	}

	if (activeBootstrapPromise) {
		return activeBootstrapPromise;
	}

	activeBootstrapPromise = (async () => {
		const capturedEpoch = sessionEpoch;
		activeAbortController = new AbortController();

		try {
			const response = await httpClient.post<AuthTokenResponseDto>(
				"/auth/refresh",
				null,
				{
					signal: activeAbortController.signal,
					skipAuthRefresh: true,
					withCredentials: true,
				},
			);

			if (capturedEpoch !== sessionEpoch) {
				return { user: null, isLoading: false, isAuthenticated: false };
			}

			const token = response.data.accessToken;
			setAccessToken(token);
			const claims = decodeJwtClaims(token);
			const user = buildAuthUser(claims);
			useAuthStore.getState().setUser(user);
			return { user, isLoading: false, isAuthenticated: true };
		} catch {
			if (capturedEpoch !== sessionEpoch) {
				return { user: null, isLoading: false, isAuthenticated: false };
			}
			setAccessToken(null);
			useAuthStore.getState().clearAuth();
			return { user: null, isLoading: false, isAuthenticated: false };
		} finally {
			activeBootstrapPromise = null;
			activeAbortController = null;
		}
	})();

	return activeBootstrapPromise;
}
