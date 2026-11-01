import axios, {
	type AxiosInstance,
	type AxiosResponse,
	type InternalAxiosRequestConfig,
} from "axios";
import { getAccessToken } from "@/lib/auth/access-token";
import { isTokenExpiringSoon } from "@/lib/auth/jwt-decoder";
import { refreshAccessToken } from "@/lib/auth/session";
import { httpClient, registerHttpInterceptors } from "./client";

declare module "axios" {
	interface AxiosRequestConfig {
		skipAuthRefresh?: boolean;
		authRetried?: boolean;
	}
}

interface QueuedRequest {
	resolve: (token: string) => void;
	reject: (error: unknown) => void;
}

let isRefreshing = false;
let failedQueue: QueuedRequest[] = [];

function processQueue(error: unknown, token: string | null = null) {
	const queue = failedQueue;
	failedQueue = [];
	for (const subscriber of queue) {
		if (token) {
			subscriber.resolve(token);
		} else {
			subscriber.reject(error);
		}
	}
}

export function installAuthInterceptors(client: AxiosInstance = httpClient) {
	const unregister = registerHttpInterceptors(
		{
			onRequest: async (config) => {
				if (config.skipAuthRefresh || config.url?.includes("/auth/")) {
					return config;
				}

				let token = getAccessToken();
				if (token && isTokenExpiringSoon(token, 30)) {
					const refreshed = await refreshAccessToken();
					if (refreshed) {
						token = refreshed;
					}
				}

				if (token && !config.headers.has("Authorization")) {
					config.headers.set("Authorization", `Bearer ${token}`);
				}
				return config;
			},
			onResponseError: async (error: unknown) => {
				if (!axios.isAxiosError(error) || error.response?.status !== 401) {
					throw error;
				}

				const config = error.config as InternalAxiosRequestConfig | undefined;
				if (
					!config ||
					config.skipAuthRefresh ||
					config.authRetried ||
					config.url?.includes("/auth/")
				) {
					throw error;
				}

				if (isRefreshing) {
					return new Promise<AxiosResponse>((resolve, reject) => {
						failedQueue.push({
							resolve: (token: string) => {
								config.authRetried = true;
								config.headers.set("Authorization", `Bearer ${token}`);
								resolve(client.request(config));
							},
							reject: (err: unknown) => {
								reject(err);
							},
						});
					});
				}

				isRefreshing = true;

				try {
					const token = await refreshAccessToken();
					if (!token) {
						processQueue(error, null);
						throw error;
					}

					processQueue(null, token);
					config.authRetried = true;
					config.headers.set("Authorization", `Bearer ${token}`);
					return await client.request(config);
				} catch (refreshErr) {
					processQueue(refreshErr, null);
					throw refreshErr;
				} finally {
					isRefreshing = false;
				}
			},
		},
		client,
	);

	return () => {
		unregister();
		isRefreshing = false;
		failedQueue = [];
	};
}
