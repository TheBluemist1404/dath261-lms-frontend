import { httpClient } from "@/lib/http/client";
import type {
	AppNotification,
	NotificationListParams,
	NotificationListResponse,
	ReadAllResponse,
} from "../types";

export async function listMyNotifications(
	{ unread, page, limit }: NotificationListParams = {},
	signal?: AbortSignal,
) {
	const { data } = await httpClient.get<NotificationListResponse>(
		"/users/me/notifications",
		{
			params: {
				unread: unread === undefined ? undefined : String(unread),
				page,
				limit,
			},
			signal,
		},
	);
	return data;
}

export async function markNotificationRead(notificationId: string) {
	const { data } = await httpClient.patch<AppNotification>(
		`/users/me/notifications/${encodeURIComponent(notificationId)}/read`,
	);
	return data;
}

export async function markAllNotificationsRead() {
	const { data } = await httpClient.patch<ReadAllResponse>(
		"/users/me/notifications/read-all",
	);
	return data;
}
