import axios, {
	type AxiosInstance,
	type AxiosResponse,
	type InternalAxiosRequestConfig,
} from "axios";

declare module "axios" {
	interface AxiosRequestConfig {
		/** Skips the refresh-and-retry flow, for the auth endpoints themselves. */
		skipAuthRefresh?: boolean;
		/** Set on the single retry after a refresh. */
		authRetried?: boolean;
	}
}

type MaybePromise<T> = T | Promise<T>;

export interface HttpInterceptorHandlers {
	onRequest?: (
		config: InternalAxiosRequestConfig,
	) => MaybePromise<InternalAxiosRequestConfig>;
	onRequestError?: (error: unknown) => unknown;
	onResponse?: (response: AxiosResponse) => MaybePromise<AxiosResponse>;
	onResponseError?: (error: unknown) => unknown;
}

export const httpClient = axios.create({
	baseURL: import.meta.env.VITE_API_BASE_URL ?? "/api",
	withCredentials: true,
	headers: {
		Accept: "application/json",
	},
});

export function registerHttpInterceptors(
	handlers: HttpInterceptorHandlers,
	client: AxiosInstance = httpClient,
) {
	const requestInterceptorId = client.interceptors.request.use(
		handlers.onRequest,
		handlers.onRequestError,
	);
	const responseInterceptorId = client.interceptors.response.use(
		handlers.onResponse,
		handlers.onResponseError,
	);

	return () => {
		client.interceptors.request.eject(requestInterceptorId);
		client.interceptors.response.eject(responseInterceptorId);
	};
}
