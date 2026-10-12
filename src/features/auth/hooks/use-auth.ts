import { useCallback } from "react";
import {
	getCurrentUserApi,
	loginApi,
	logoutApi,
	registerApi,
} from "@/features/auth/api/auth.api";
import type {
	AuthResponse,
	AuthUser,
	LoginCredentials,
	RegisterPayload,
} from "@/features/auth/types";
import { queryClient } from "@/lib/query/client";
import { router } from "@/router";
import { type AuthState, useAuthStore } from "@/stores/auth.store";

export interface UseAuthReturn {
	user: AuthUser | null;
	status: AuthState["status"];
	isLoading: boolean;
	isAuthenticated: boolean;
	login: (credentials: LoginCredentials) => Promise<AuthResponse>;
	register: (payload: RegisterPayload) => Promise<AuthResponse>;
	logout: () => Promise<void>;
	refreshSession: () => Promise<AuthUser | null>;
}

export function useAuth(): UseAuthReturn {
	const user = useAuthStore((state) => state.user);
	const status = useAuthStore((state) => state.status);

	const login = useCallback(
		async (credentials: LoginCredentials): Promise<AuthResponse> => {
			const response = await loginApi(credentials);
			useAuthStore.getState().setUser(response.user);
			await router.invalidate();
			return response;
		},
		[],
	);

	const register = useCallback(
		async (payload: RegisterPayload): Promise<AuthResponse> => {
			const response = await registerApi(payload);
			useAuthStore.getState().setUser(response.user);
			await router.invalidate();
			return response;
		},
		[],
	);

	const logout = useCallback(async (): Promise<void> => {
		try {
			await logoutApi();
		} finally {
			useAuthStore.getState().clearAuth();
			queryClient.clear();
			await router.invalidate();
		}
	}, []);

	const refreshSession = useCallback(async (): Promise<AuthUser | null> => {
		try {
			const currentUser = await getCurrentUserApi();
			useAuthStore.getState().setUser(currentUser);
			await router.invalidate();
			return currentUser;
		} catch (error) {
			useAuthStore.getState().setUser(null);
			await router.invalidate();
			throw error;
		}
	}, []);

	return {
		user,
		status,
		isLoading: status === "loading",
		isAuthenticated: status === "authenticated",
		login,
		register,
		logout,
		refreshSession,
	};
}
