import axios from "axios";
import { httpClient } from "@/lib/http/client";
import type {
	AuthResponse,
	AuthUser,
	LoginCredentials,
	RegisterPayload,
	UserRole,
} from "../types";

const VALID_ROLES = ["student", "lecturer", "admin"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function isUserRole(value: string): value is UserRole {
	return (VALID_ROLES as readonly string[]).includes(value);
}

export function normalizeCurrentUserResponse(raw: unknown): AuthUser {
	if (!isRecord(raw)) {
		throw new Error("Invalid payload: expected object");
	}

	const candidate = isRecord(raw.user) ? raw.user : raw;
	const { id, name, email, role } = candidate;

	if (
		typeof id !== "string" ||
		typeof name !== "string" ||
		typeof email !== "string" ||
		typeof role !== "string"
	) {
		throw new Error("Malformed identity: missing required identity fields");
	}

	const normalizedRole = role.toLowerCase();
	if (!isUserRole(normalizedRole)) {
		throw new Error(`Unauthorized role: '${role}' is not a valid LMS role`);
	}

	return {
		id,
		name,
		email,
		role: normalizedRole,
	};
}

export async function getCurrentUserApi(): Promise<AuthUser | null> {
	try {
		const response = await httpClient.get<unknown>("/auth/me");
		return normalizeCurrentUserResponse(response.data);
	} catch (error) {
		if (axios.isAxiosError(error) && error.response?.status === 401) {
			return null;
		}
		throw error;
	}
}

export async function loginApi(
	credentials: LoginCredentials,
): Promise<AuthResponse> {
	const response = await httpClient.post<unknown>("/auth/login", credentials);
	const user = normalizeCurrentUserResponse(response.data);
	return { user };
}

export async function registerApi(
	payload: RegisterPayload,
): Promise<AuthResponse> {
	const response = await httpClient.post<unknown>("/auth/register", payload);
	const user = normalizeCurrentUserResponse(response.data);
	return { user };
}

export async function logoutApi(): Promise<void> {
	await httpClient.post("/auth/logout");
}
