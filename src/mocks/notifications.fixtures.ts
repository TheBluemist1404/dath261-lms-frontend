import type { AppNotification } from "@/features/notifications/types";

// Seed rows shaped like BE PR #46 responses (newest first).
const seed: AppNotification[] = [
	{
		id: "notif-1",
		type: "NEW_CONTENT",
		title: "New content in Operating Systems",
		message: "Module 2 has new material.",
		targetType: "COURSE_BLOCK",
		targetId: "block-1-2",
		courseId: "course-os",
		readAt: null,
		createdAt: "2026-11-25T09:00:00.000Z",
	},
	{
		id: "notif-2",
		type: "RESULT_RELEASED",
		title: "Results released in Operating Systems",
		message: "System calls quiz results are now available.",
		targetType: "COURSE_BLOCK",
		targetId: "block-1-3",
		courseId: "course-os",
		readAt: null,
		createdAt: "2026-11-24T09:00:00.000Z",
	},
	{
		id: "notif-3",
		type: "NEW_CONTENT",
		title: "Operating Systems is now available",
		message: "The course was published.",
		targetType: "COURSE",
		targetId: "course-os",
		courseId: "course-os",
		readAt: "2026-11-23T10:00:00.000Z",
		createdAt: "2026-11-23T09:00:00.000Z",
	},
];

let rows: AppNotification[] = seed.map((row) => ({ ...row }));

export function getMockNotifications() {
	return rows;
}

export function setMockNotifications(next: AppNotification[]) {
	rows = next.map((row) => ({ ...row }));
}

export function resetNotificationMockState() {
	rows = seed.map((row) => ({ ...row }));
}
