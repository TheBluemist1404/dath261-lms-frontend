import axios from "axios";
import type {
	AuthTokenResponseDto,
	RouterAuthContext,
} from "@/features/auth/types";
import { httpClient } from "@/lib/http/client";
import { useAuthStore } from "@/stores/auth.store";
import { setAccessToken } from "./access-token";
import { buildAuthUser, decodeJwtClaims } from "./jwt-decoder";

let sessionEpoch = 0;
let activeAbortController: AbortController | null = null;
let activeBootstrapPromise: Promise<RouterAuthContext> | null = null;
let pendingRefresh: Promise<string | null> | null = null;

const UNAUTHENTICATED_CONTEXT: RouterAuthContext = {
	user: null,
	isLoading: false,
	isAuthenticated: false,
};

function hasLogoutTombstone(): boolean {
	try {
		return (
			typeof window !== "undefined" &&
			localStorage.getItem("nodus_logout_tombstone") === "true"
		);
	} catch {
		return false;
	}
}

export function invalidateSessionEpoch(): number {
	sessionEpoch += 1;
	if (activeAbortController) {
		activeAbortController.abort();
		activeAbortController = null;
	}
	activeBootstrapPromise = null;
	pendingRefresh = null;
	return sessionEpoch;
}

export function getSessionEpoch(): number {
	return sessionEpoch;
}

export function resetSessionForTest(): void {
	sessionEpoch = 0;
	if (activeAbortController) {
		activeAbortController.abort();
		activeAbortController = null;
	}
	activeBootstrapPromise = null;
	pendingRefresh = null;
}

export const resetSessionBarrierForTest = resetSessionForTest;

export function bootstrapSession(): Promise<RouterAuthContext> {
	if (hasLogoutTombstone()) {
		setAccessToken(null);
		useAuthStore.getState().clearAuth();
		return Promise.resolve(UNAUTHENTICATED_CONTEXT);
	}

	const currentAuth = useAuthStore.getState();
	if (currentAuth.status === "unauthenticated") {
		return Promise.resolve(UNAUTHENTICATED_CONTEXT);
	}

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
				return UNAUTHENTICATED_CONTEXT;
			}

			const token = response.data.accessToken;
			setAccessToken(token);
			const claims = decodeJwtClaims(token);
			const user = buildAuthUser(claims);
			useAuthStore.getState().setUser(user);
			return { user, isLoading: false, isAuthenticated: true };
		} catch {
			if (capturedEpoch !== sessionEpoch) {
				return UNAUTHENTICATED_CONTEXT;
			}
			setAccessToken(null);
			useAuthStore.getState().clearAuth();
			return UNAUTHENTICATED_CONTEXT;
		} finally {
			activeBootstrapPromise = null;
			activeAbortController = null;
		}
	})();

	return activeBootstrapPromise;
}

export const bootstrapSessionSafe = bootstrapSession;

export function applyAccessToken(token: string): void {
	try {
		const claims = decodeJwtClaims(token);
		setAccessToken(token);
		const user = buildAuthUser(claims);
		useAuthStore.getState().setUser(user);
	} catch {
		endSession();
	}
}

export function endSession(): void {
	setAccessToken(null);
	useAuthStore.getState().clearAuth();
}

export function refreshAccessToken(): Promise<string | null> {
	if (hasLogoutTombstone()) {
		endSession();
		return Promise.resolve(null);
	}

	pendingRefresh ??= httpClient
		.post<AuthTokenResponseDto>("/auth/refresh", undefined, {
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

export async function restoreSession(): Promise<void> {
	await bootstrapSession();
}
