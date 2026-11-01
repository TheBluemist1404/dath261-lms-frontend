import type { AuthUser } from "@/stores/auth.store";

export type { AuthState, AuthUser, UserRole } from "@/stores/auth.store";

export type UserRoleDto = "STUDENT" | "LECTURER" | "ADMIN";
export type AccountStatusDto = "ACTIVE" | "SUSPENDED";
export type RegisterRoleDto = "STUDENT" | "LECTURER";

export interface RegisterDto {
	email: string;
	password: string;
	role: RegisterRoleDto;
	firstName: string;
	lastName: string;
}

export interface LoginDto {
	email: string;
	password: string;
}

export type LoginCredentials = LoginDto;

export interface AuthTokenResponseDto {
	accessToken: string;
}

export interface RegisteredUserResponseDto {
	id: string;
	email: string;
	role: UserRoleDto;
	status: AccountStatusDto;
	firstName: string | null;
	lastName: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface RegisterResponseDto {
	user: RegisteredUserResponseDto;
}

export interface RegisterPayload {
	fullName: string;
	email: string;
	password: string;
	role: "student" | "lecturer" | "STUDENT" | "LECTURER";
}

export interface AuthResponse {
	user: AuthUser;
	message?: string;
}

export interface RouterAuthContext {
	user: AuthUser | null;
	isLoading: boolean;
	isAuthenticated: boolean;
}
