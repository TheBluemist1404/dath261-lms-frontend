// Mirrors the notification DTOs of BE PR #46 (`/users/me/notifications`).

export type NotificationType =
	| "NEW_CONTENT"
	| "ASSESSMENT_DUE"
	| "RESULT_RELEASED"
	| "COLLABORATION_INVITE"
	| "SYSTEM";

export interface AppNotification {
	id: string;
	type: NotificationType;
	title: string;
	message: string;
	/** "COURSE" or "COURSE_BLOCK" for the types in use. */
	targetType: string | null;
	targetId: string | null;
	courseId: string | null;
	readAt: string | null;
	createdAt: string;
}

export interface NotificationPageMeta {
	total: number;
	page: number;
	limit: number;
	totalPages: number;
	hasNextPage: boolean;
	hasPrevPage: boolean;
	/** Total unread for the user, independent of the filter and page. */
	unreadCount: number;
}

export interface NotificationListResponse {
	data: AppNotification[];
	meta: NotificationPageMeta;
}

export interface NotificationListParams {
	unread?: boolean;
	page?: number;
	limit?: number;
}

export interface ReadAllResponse {
	updated: number;
}
