import { HttpResponse, http } from "msw";
import { requireMockAuth } from "@/test/mocks/mock-auth-guard";
import { getMockNotifications } from "./notifications.fixtures";

// Mirrors BE PR #46: GET /users/me/notifications, PATCH .../:id/read,
// PATCH .../read-all.

function positiveInt(raw: string | null, fallback: number, max?: number) {
	const value = Number(raw);
	if (raw === null || !Number.isInteger(value) || value < 1) return fallback;
	return max ? Math.min(value, max) : value;
}

export const notificationsHandlers = [
	http.get("*/api/users/me/notifications", ({ request }) => {
		const authError = requireMockAuth(request);
		if (authError) return authError;

		const url = new URL(request.url);
		const page = positiveInt(url.searchParams.get("page"), 1);
		const limit = positiveInt(url.searchParams.get("limit"), 20, 100);
		const all = getMockNotifications();
		const filtered =
			url.searchParams.get("unread") === "true"
				? all.filter((row) => row.readAt === null)
				: all;
		const total = filtered.length;
		const totalPages = Math.ceil(total / limit);

		return HttpResponse.json({
			data: filtered.slice((page - 1) * limit, page * limit),
			meta: {
				total,
				page,
				limit,
				totalPages,
				hasNextPage: page < totalPages,
				hasPrevPage: page > 1,
				unreadCount: all.filter((row) => row.readAt === null).length,
			},
		});
	}),

	http.patch("*/api/users/me/notifications/read-all", ({ request }) => {
		const authError = requireMockAuth(request);
		if (authError) return authError;

		const now = new Date().toISOString();
		let updated = 0;
		for (const row of getMockNotifications()) {
			if (row.readAt === null) {
				row.readAt = now;
				updated += 1;
			}
		}
		return HttpResponse.json({ updated });
	}),

	http.patch(
		"*/api/users/me/notifications/:notificationId/read",
		({ request, params }) => {
			const authError = requireMockAuth(request);
			if (authError) return authError;

			const row = getMockNotifications().find(
				(item) => item.id === String(params.notificationId),
			);
			if (!row) {
				return HttpResponse.json(
					{
						statusCode: 404,
						message: "Notification not found.",
						error: "Not Found",
					},
					{ status: 404 },
				);
			}
			row.readAt ??= new Date().toISOString();
			return HttpResponse.json(row);
		},
	),
];
