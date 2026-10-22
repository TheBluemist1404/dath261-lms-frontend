import axios from "axios";
import { httpClient } from "@/lib/http/client";
import { useAuthStore } from "@/stores/auth.store";
import { readAccessTokenClaims, setAccessToken } from "./access-token";

interface AuthTokenResponse {
	accessToken: string;
}

let pendingRefresh: Promise<string | null> | null = null;

/**
 * Exchanges the refresh cookie for a new access token. Concurrent callers share
 * one request so a burst of 401s triggers a single refresh.
 */
export function refreshAccessToken(): Promise<string | null> {
	pendingRefresh ??= httpClient
		.post<AuthTokenResponse>("/auth/refresh", undefined, {
			withCredentials: true,
			skipAuthRefresh: true,
		})
		.then(({ data }) => {
			applyAccessToken(data.accessToken);
			return data.accessToken;
		})
		.catch((error: unknown) => {
			if (axios.isAxiosError(error) && error.response?.status === 401) {
				endSession();
				return null;
			}
			throw error;
		})
		.finally(() => {
			pendingRefresh = null;
		});

	return pendingRefresh;
}

/** Stores the token and derives the signed-in identity from its claims. */
export function applyAccessToken(token: string) {
	const claims = readAccessTokenClaims(token);
	if (!claims) {
		endSession();
		return;
	}

	setAccessToken(token);
	// The backend has no current-user endpoint yet, so name and email stay empty.
	useAuthStore
		.getState()
		.setUser({ id: claims.userId, role: claims.role, name: "", email: "" });
}

export function endSession() {
	setAccessToken(null);
	useAuthStore.getState().clearAuth();
}

/** Restores a session from the refresh cookie on app load. */
export async function restoreSession() {
	try {
		await refreshAccessToken();
	} catch {
		// Network or server failure: treat as signed out rather than blocking the app.
		endSession();
	}
}
