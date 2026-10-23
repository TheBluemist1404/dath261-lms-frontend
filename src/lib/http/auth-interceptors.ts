import axios, { type AxiosInstance } from "axios";
import { getAccessToken } from "@/lib/auth/access-token";
import { refreshAccessToken } from "@/lib/auth/session";
import { httpClient, registerHttpInterceptors } from "./client";

declare module "axios" {
	interface AxiosRequestConfig {
		/** Skips the refresh-and-retry flow, for the auth endpoints themselves. */
		skipAuthRefresh?: boolean;
		/** Set on the single retry after a refresh. */
		authRetried?: boolean;
	}
}

/**
 * Sends the in-memory access token as a Bearer header and, on a 401, refreshes
 * it once through the refresh cookie before retrying the original request.
 */
export function installAuthInterceptors(client: AxiosInstance = httpClient) {
	return registerHttpInterceptors(
		{
			onRequest: (config) => {
				const token = getAccessToken();
				if (token && !config.headers.has("Authorization")) {
					config.headers.set("Authorization", `Bearer ${token}`);
				}
				return config;
			},
			onResponseError: async (error) => {
				if (!axios.isAxiosError(error) || error.response?.status !== 401) {
					throw error;
				}

				const config = error.config;
				if (!config || config.skipAuthRefresh || config.authRetried) {
					throw error;
				}

				const token = await refreshAccessToken();
				if (!token) throw error;

				config.authRetried = true;
				config.headers.set("Authorization", `Bearer ${token}`);
				return client.request(config);
			},
		},
		client,
	);
}
