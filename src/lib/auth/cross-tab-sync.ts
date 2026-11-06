import { setAccessToken } from "@/lib/auth/access-token";
import { queryClient } from "@/lib/query/client";
import { router } from "@/router";
import { useAuthStore } from "@/stores/auth.store";
import { bootstrapSession, invalidateSessionEpoch } from "./session";

export const AUTH_CHANNEL = "nodus_lms_auth";

export type AuthSyncMessage =
	| { type: "LOGOUT"; timestamp: number }
	| { type: "LOGIN"; timestamp: number; userId?: string };

export function initCrossTabSync(): () => void {
	if (
		typeof window === "undefined" ||
		typeof BroadcastChannel === "undefined"
	) {
		return () => {};
	}

	const channel = new BroadcastChannel(AUTH_CHANNEL);

	channel.onmessage = async (event: MessageEvent<AuthSyncMessage>) => {
		if (event.data?.type === "LOGOUT") {
			invalidateSessionEpoch();
			setAccessToken(null);
			useAuthStore.getState().clearAuth();
			queryClient.clear();
			try {
				await router.invalidate();
			} catch {
				// Router might not be mounted yet
			}
		} else if (event.data?.type === "LOGIN") {
			if (useAuthStore.getState().status !== "authenticated") {
				useAuthStore.getState().reset();
				await bootstrapSession();
				try {
					await router.invalidate();
				} catch {
					// Router might not be mounted yet
				}
			}
		}
	};

	return () => {
		channel.close();
	};
}

export function broadcastLogout(): void {
	if (
		typeof window === "undefined" ||
		typeof BroadcastChannel === "undefined"
	) {
		return;
	}

	try {
		const channel = new BroadcastChannel(AUTH_CHANNEL);
		channel.postMessage({ type: "LOGOUT", timestamp: Date.now() });
		channel.close();
	} catch {
		// Ignore BroadcastChannel errors in unsupported contexts
	}
}

export function broadcastLogin(userId?: string): void {
	if (
		typeof window === "undefined" ||
		typeof BroadcastChannel === "undefined"
	) {
		return;
	}

	try {
		const channel = new BroadcastChannel(AUTH_CHANNEL);
		channel.postMessage({ type: "LOGIN", timestamp: Date.now(), userId });
		channel.close();
	} catch {
		// Ignore BroadcastChannel errors in unsupported contexts
	}
}
