import {
	queryOptions,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import type { NotificationListParams } from "../types";
import {
	listMyNotifications,
	markAllNotificationsRead,
	markNotificationRead,
} from "./notification.api";

export const LATEST_NOTIFICATIONS_LIMIT = 10;
export const NOTIFICATIONS_PAGE_LIMIT = 20;
export const UNREAD_REFETCH_INTERVAL_MS = 60_000;

export const notificationKeys = {
	all: ["notifications"] as const,
	latest: () => [...notificationKeys.all, "latest"] as const,
	list: (params: NotificationListParams) =>
		[...notificationKeys.all, "list", params] as const,
};

/** Latest notifications for the header bell; its meta carries the unread count. */
export function latestNotificationsQuery() {
	return queryOptions({
		queryKey: notificationKeys.latest(),
		queryFn: ({ signal }) =>
			listMyNotifications(
				{ page: 1, limit: LATEST_NOTIFICATIONS_LIMIT },
				signal,
			),
		refetchInterval: UNREAD_REFETCH_INTERVAL_MS,
		refetchOnWindowFocus: true,
	});
}

export function notificationListQuery(params: NotificationListParams) {
	return queryOptions({
		queryKey: notificationKeys.list(params),
		queryFn: ({ signal }) => listMyNotifications(params, signal),
	});
}

export function useMarkNotificationRead() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: markNotificationRead,
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
	});
}

export function useMarkAllNotificationsRead() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: markAllNotificationsRead,
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
	});
}
