import { HttpResponse, http } from "msw";
import type {
	AdminReport,
	PagedResponse,
	ReportHistoryAction,
	UpdateCourseSuspensionInput,
	UpdateUserStatusInput,
} from "../types";
import { mockAdminDb } from "./mock-db";

// Mock of api/moderation.api.ts. Users and courses mirror the backend admin
// routes and shapes (BE PR #36); report paths are placeholders because the
// backend has no report review endpoints yet.

const api = (path: string) => `*/api${path}`;

function error(statusCode: number, message: string) {
	return HttpResponse.json({ statusCode, message }, { status: statusCode });
}

async function readReason(request: Request) {
	const body = (await request.json()) as { reason?: string };
	return body.reason?.trim() || null;
}

function record(report: AdminReport, action: ReportHistoryAction) {
	report.history.push({
		id: `${report.id}-${action.toLowerCase()}`,
		action,
		actor: mockAdminDb.admin,
		createdAt: new Date().toISOString(),
		reasonRecorded: true,
	});
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
	http.get(api("/admin/reports"), () => HttpResponse.json(mockAdminDb.reports)),

	http.get(api("/admin/reports/:id"), ({ params }) => {
		const report = mockAdminDb.reports.find((entry) => entry.id === params.id);
		return report ? HttpResponse.json(report) : error(404, "Report not found");
	}),

	http.post(api("/admin/reports/:id/dismiss"), async ({ params, request }) => {
		const report = mockAdminDb.reports.find((entry) => entry.id === params.id);
		if (!report) return error(404, "Report not found");
		if (report.status !== "PENDING")
			return error(409, "Report has already been reviewed");
		if (!(await readReason(request))) return error(400, "Reason is required");
		report.status = "DISMISSED";
		record(report, "DISMISSED");
		return HttpResponse.json(report);
	}),

	http.post(api("/admin/reports/:id/resolve"), async ({ params, request }) => {
		const report = mockAdminDb.reports.find((entry) => entry.id === params.id);
		if (!report) return error(404, "Report not found");
		if (report.status !== "PENDING")
			return error(409, "Report has already been reviewed");
		if (!(await readReason(request))) return error(400, "Reason is required");
		report.status = "ACTION_TAKEN";
		record(
			report,
			report.target.type === "COURSE" ? "COURSE_SUSPENDED" : "USER_SUSPENDED",
		);
		return HttpResponse.json(report);
	}),

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
			course.isSuspended = body.suspended;
			return HttpResponse.json(course);
		},
	),
];
