import axios from "axios";
import { httpClient } from "@/lib/http/client";
import { useAuthStore } from "@/stores/auth.store";
import { setAccessToken } from "./access-token";
import { buildAuthUser, decodeJwtClaims } from "./jwt-decoder";

interface AuthTokenResponse {
	accessToken: string;
}

let pendingRefresh: Promise<string | null> | null = null;

export function refreshAccessToken(): Promise<string | null> {
	if (
		typeof window !== "undefined" &&
		localStorage.getItem("nodus_logout_tombstone") === "true"
	) {
		endSession();
		return Promise.resolve(null);
	}

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

export function applyAccessToken(token: string) {
	try {
		const claims = decodeJwtClaims(token);
		setAccessToken(token);
		const user = buildAuthUser(claims);
		useAuthStore.getState().setUser(user);
	} catch {
		endSession();
	}
}

export function endSession() {
	setAccessToken(null);
	useAuthStore.getState().clearAuth();
}

export async function restoreSession() {
	try {
		await refreshAccessToken();
	} catch {
		endSession();
	}
}
