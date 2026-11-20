import { HttpResponse, http } from "msw";
import type {
	AdminReport,
	AdminReportItem,
	PagedResponse,
	ReportHistoryAction,
	UpdateCourseSuspensionInput,
	UpdateReportStatusInput,
	UpdateUserStatusInput,
} from "../types";
import { mockAdminDb } from "./mock-db";

// Mock of api/moderation.api.ts, mirroring the backend admin routes and shapes:
// users and courses (BE PR #36) and report review (BE PR #43).

const api = (path: string) => `*/api${path}`;

function error(statusCode: number, message: string) {
	return HttpResponse.json({ statusCode, message }, { status: statusCode });
}

function record(
	report: AdminReport,
	action: ReportHistoryAction,
	reasonRecorded: string | null,
) {
	report.history.push({
		id: `${report.id}-${action.toLowerCase()}`,
		action,
		actor: mockAdminDb.admin,
		createdAt: new Date().toISOString(),
		reasonRecorded,
	});
}

/** BE PR #43 lists reports without the message detail and history. */
function toItem({
	message: _message,
	history: _history,
	...item
}: AdminReport): AdminReportItem {
	return item;
}

/**
 * BE PR #43 shows a suspension in the history of reports on that target:
 * course suspensions on COURSE reports, account suspensions on USER reports.
 */
function recordSuspension(
	type: "COURSE" | "USER",
	targetId: string,
	reason: string | undefined,
) {
	for (const report of mockAdminDb.reports) {
		if (report.target.type === type && report.target.id === targetId) {
			record(
				report,
				type === "COURSE" ? "COURSE_SUSPENDED" : "USER_SUSPENDED",
				reason?.trim() || null,
			);
		}
	}
}

/** BE PR #36 paging: page and pageSize default to 1 and 20. */
function paged<T>(request: Request, all: T[]): PagedResponse<T> {
	const params = new URL(request.url).searchParams;
	const page = Number(params.get("page") ?? 1);
	const pageSize = Number(params.get("pageSize") ?? 20);
	const start = (page - 1) * pageSize;
	return {
		items: all.slice(start, start + pageSize),
		page,
		pageSize,
		total: all.length,
	};
}

export const adminHandlers = [
	http.get(api("/admin/reports"), ({ request }) =>
		HttpResponse.json(paged(request, mockAdminDb.reports.map(toItem))),
	),

	http.get(api("/admin/reports/:reportId"), ({ params }) => {
		const report = mockAdminDb.reports.find(
			(entry) => entry.id === params.reportId,
		);
		return report ? HttpResponse.json(report) : error(404, "Report not found.");
	}),

	http.patch(
		api("/admin/reports/:reportId/status"),
		async ({ params, request }) => {
			const body = (await request.json()) as Partial<UpdateReportStatusInput>;
			const reason = body.reason?.trim();
			if (
				(body.status !== "DISMISSED" && body.status !== "ACTION_TAKEN") ||
				!reason
			)
				return error(400, "Invalid request body.");
			const report = mockAdminDb.reports.find(
				(entry) => entry.id === params.reportId,
			);
			if (!report) return error(404, "Report not found.");
			if (report.status !== "PENDING")
				return error(409, "This report has already been reviewed.");
			report.status = body.status;
			record(report, body.status, reason);
			return HttpResponse.json(toItem(report));
		},
	),

	http.get(api("/admin/users"), ({ request }) =>
		HttpResponse.json(paged(request, mockAdminDb.users)),
	),

	http.patch(
		api("/admin/users/:userId/status"),
		async ({ params, request }) => {
			const body = (await request.json()) as Partial<UpdateUserStatusInput>;
			if (body.status !== "ACTIVE" && body.status !== "SUSPENDED")
				return error(400, "Invalid status");
			if (params.userId === mockAdminDb.admin.id && body.status === "SUSPENDED")
				return error(400, "You cannot suspend your own account.");
			const user = mockAdminDb.users.find(
				(entry) => entry.id === params.userId,
			);
			if (!user) return error(404, "User not found.");
			if (user.status === "ACTIVE" && body.status === "SUSPENDED")
				recordSuspension("USER", user.id, body.reason);
			user.status = body.status;
			return HttpResponse.json(user);
		},
	),

	http.get(api("/admin/courses"), ({ request }) =>
		HttpResponse.json(paged(request, mockAdminDb.courses)),
	),

	http.patch(
		api("/admin/courses/:courseId/suspension"),
		async ({ params, request }) => {
			const body =
				(await request.json()) as Partial<UpdateCourseSuspensionInput>;
			if (typeof body.suspended !== "boolean")
				return error(400, "Invalid request body.");
			const course = mockAdminDb.courses.find(
				(entry) => entry.id === params.courseId,
			);
			if (!course) return error(404, "Course not found.");
			if (!course.isSuspended && body.suspended)
				recordSuspension("COURSE", course.id, body.reason);
			course.isSuspended = body.suspended;
			return HttpResponse.json(course);
		},
	),
];
