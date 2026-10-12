import type { AuthUser, UserRole } from "@/stores/auth.store";

export type { AuthState, AuthUser, UserRole } from "@/stores/auth.store";

export interface LoginCredentials {
	email: string;
	password: string;
}

export interface RegisterPayload {
	name: string;
	email: string;
	password: string;
	role: Extract<UserRole, "student" | "lecturer">;
}

export interface AuthResponse {
	user: AuthUser;
	message?: string;
}
