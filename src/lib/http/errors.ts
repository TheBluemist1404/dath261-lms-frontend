import axios from "axios";

/** Reads the NestJS error message, falling back to a generic sentence. */
export function getApiErrorMessage(
	error: unknown,
	fallback = "Something went wrong. Try again.",
) {
	if (axios.isAxiosError(error)) {
		const message: unknown = error.response?.data?.message;
		if (typeof message === "string") return message;
		if (Array.isArray(message)) {
			const stringMessages = message.filter(
				(item): item is string => typeof item === "string",
			);
			if (stringMessages.length > 0) {
				return stringMessages.join(". ");
			}
		}
	}
	return fallback;
}

export function getApiErrorStatus(error: unknown) {
	return axios.isAxiosError(error) ? error.response?.status : undefined;
}
