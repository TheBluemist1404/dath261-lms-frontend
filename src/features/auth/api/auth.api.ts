import type { AxiosRequestConfig } from "axios";
import { httpClient } from "@/lib/http/client";
import type {
	AuthTokenResponseDto,
	LoginCredentials,
	RegisterDto,
	RegisterPayload,
	RegisterResponseDto,
	RegisterRoleDto,
} from "../types";
import { partitionFullName } from "../utils/name-partitioner";

export async function loginApi(
	credentials: LoginCredentials,
): Promise<AuthTokenResponseDto> {
	const response = await httpClient.post<AuthTokenResponseDto>(
		"/auth/login",
		credentials,
		{ withCredentials: true, skipAuthRefresh: true },
	);
	return response.data;
}

export async function registerApi(
	payload: RegisterPayload,
): Promise<RegisterResponseDto> {
	const { firstName, lastName } = partitionFullName(payload.fullName);

	const dto: RegisterDto = {
		email: payload.email,
		password: payload.password,
		role: payload.role.toUpperCase() as RegisterRoleDto,
		firstName,
		lastName,
	};

	const response = await httpClient.post<RegisterResponseDto>(
		"/auth/register",
		dto,
	);
	return response.data;
}

export async function refreshApi(
	config?: AxiosRequestConfig,
): Promise<AuthTokenResponseDto> {
	const response = await httpClient.post<AuthTokenResponseDto>(
		"/auth/refresh",
		null,
		{
			withCredentials: true,
			skipAuthRefresh: true,
			...config,
		},
	);
	return response.data;
}

export async function logoutApi(): Promise<void> {
	await httpClient.post<void>("/auth/logout", null, {
		withCredentials: true,
		skipAuthRefresh: true,
	});
}
