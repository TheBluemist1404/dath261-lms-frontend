import type { AppNotification } from "../types";

export interface NotificationTarget {
	courseId: string;
	blockId?: string;
}

/**
 * Where an item opens (issue #59): NEW_CONTENT opens the course reader,
 * RESULT_RELEASED opens the quiz block in the reader. Other types, or a target
 * the backend could not resolve (courseId null), only get marked read.
 */
export function getNotificationTarget(
	notification: AppNotification,
): NotificationTarget | null {
	const { type, courseId, targetType, targetId } = notification;
	if (!courseId) return null;
	if (type === "NEW_CONTENT") return { courseId };
	if (type === "RESULT_RELEASED") {
		return targetType === "COURSE_BLOCK" && targetId
			? { courseId, blockId: targetId }
			: { courseId };
	}
	return null;
}

export function formatUnreadBadge(count: number): string | null {
	if (count <= 0) return null;
	return count > 9 ? "9+" : String(count);
}
