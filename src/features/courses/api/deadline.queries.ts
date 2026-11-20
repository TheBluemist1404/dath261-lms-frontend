import { queryOptions, useQuery } from "@tanstack/react-query";
import { DEFAULT_DEADLINE_DAYS, getMyDeadlines } from "./deadline.api";

export const deadlineKeys = {
	all: ["deadlines"] as const,
	myLists: () => [...deadlineKeys.all, "my"] as const,
	myList: (days: number) => [...deadlineKeys.myLists(), days] as const,
};

export function myDeadlinesOptions(days = DEFAULT_DEADLINE_DAYS) {
	return queryOptions({
		queryKey: deadlineKeys.myList(days),
		queryFn: ({ signal }) => getMyDeadlines(days, signal),
	});
}

export function useMyDeadlines(
	days = DEFAULT_DEADLINE_DAYS,
	options?: { enabled?: boolean },
) {
	return useQuery({
		...myDeadlinesOptions(days),
		enabled: options?.enabled ?? true,
	});
}
