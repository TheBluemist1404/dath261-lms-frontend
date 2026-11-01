import { useCallback } from "react";
import { setAccessToken } from "@/lib/auth/access-token";
import { broadcastLogin } from "@/lib/auth/cross-tab-sync";
import { buildAuthUser, decodeJwtClaims } from "@/lib/auth/jwt-decoder";
import { terminateSession } from "@/lib/auth/session-termination";
import { useAuthStore } from "@/stores/auth.store";
import { loginApi, registerApi } from "../api/auth.api";
import type {
	AuthStatus,
	AuthTokenResponseDto,
	AuthUser,
	LoginCredentials,
	RegisterPayload,
	RegisterResponseDto,
} from "../types";

export interface UseAuthReturn {
	user: AuthUser | null;
	status: AuthStatus;
	isLoading: boolean;
	isAuthenticated: boolean;
	login: (credentials: LoginCredentials) => Promise<AuthTokenResponseDto>;
	register: (payload: RegisterPayload) => Promise<RegisterResponseDto>;
	logout: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
	const user = useAuthStore((state) => state.user);
	const status = useAuthStore((state) => state.status);
	const isLoading = status === "loading";
	const isAuthenticated = status === "authenticated";

	const login = useCallback(async (credentials: LoginCredentials) => {
		try {
			if (typeof window !== "undefined") {
				localStorage.removeItem("nodus_logout_tombstone");
			}
		} catch {
			// Ignore localStorage errors
		}

		const result = await loginApi(credentials);
		setAccessToken(result.accessToken);
		const claims = decodeJwtClaims(result.accessToken);
		const authUser = buildAuthUser(claims, credentials.email);
		useAuthStore.getState().setUser(authUser);
		broadcastLogin(authUser.id);
		return result;
	}, []);

	const register = useCallback(async (payload: RegisterPayload) => {
		return await registerApi(payload);
	}, []);

	const logout = useCallback(async () => {
		await terminateSession();
	}, []);

	return {
		user,
		status,
		isLoading,
		isAuthenticated,
		login,
		register,
		logout,
	};
}
