import axios, {
	type AxiosInstance,
	type AxiosResponse,
	type InternalAxiosRequestConfig,
} from "axios";

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
	headers: {
		Accept: "application/json",
	},
	withCredentials: true,
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
