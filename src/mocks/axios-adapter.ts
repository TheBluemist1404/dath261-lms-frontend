import axios, {
	type AxiosAdapter,
	AxiosError,
	AxiosHeaders,
	type AxiosResponse,
	type InternalAxiosRequestConfig,
} from "axios";
import { getResponse, type RequestHandler } from "msw";

/**
 * Resolves requests against MSW handlers inside the page, falling back to the
 * network for anything unhandled. Unlike the service worker, this cannot lose
 * its registration when the browser suspends the worker.
 */
export function createMockAdapter(handlers: RequestHandler[]): AxiosAdapter {
	const network = axios.getAdapter(axios.defaults.adapter);

	return async (config: InternalAxiosRequestConfig) => {
		const method = (config.method ?? "get").toUpperCase();
		const url = new URL(axios.getUri(config), window.location.origin);
		const headers = new Headers();
		for (const [name, value] of Object.entries(
			AxiosHeaders.from(config.headers).toJSON(),
		)) {
			if (value != null) headers.set(name, String(value));
		}

		const request = new Request(url, {
			method,
			headers,
			body: method === "GET" || method === "HEAD" ? undefined : config.data,
		});
		const response = await getResponse(handlers, request);
		if (!response) return network(config);

		if (response.type === "error") {
			throw new AxiosError("Network Error", AxiosError.ERR_NETWORK, config);
		}

		const axiosResponse: AxiosResponse = {
			// Raw text: axios applies transformResponse (JSON parsing) afterwards.
			data: await response.text(),
			status: response.status,
			statusText: response.statusText,
			headers: Object.fromEntries(response.headers.entries()),
			config,
			request: undefined,
		};

		const validateStatus = config.validateStatus;
		if (validateStatus && !validateStatus(response.status)) {
			throw new AxiosError(
				`Request failed with status code ${response.status}`,
				response.status >= 500
					? AxiosError.ERR_BAD_RESPONSE
					: AxiosError.ERR_BAD_REQUEST,
				config,
				undefined,
				axiosResponse,
			);
		}
		return axiosResponse;
	};
}
