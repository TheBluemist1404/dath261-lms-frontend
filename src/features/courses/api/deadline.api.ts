import { httpClient } from "@/lib/http/client";
import type { DeadlineResponseDto } from "../types/enrollment.types";

export const DEFAULT_DEADLINE_DAYS = 14;
export const MIN_DEADLINE_DAYS = 1;
export const MAX_DEADLINE_DAYS = 90;

export async function getMyDeadlines(
	days = DEFAULT_DEADLINE_DAYS,
	signal?: AbortSignal,
): Promise<DeadlineResponseDto[]> {
	const { data } = await httpClient.get<DeadlineResponseDto[]>(
		"/users/me/deadlines",
		{ params: { days }, signal },
	);
	return data;
}
