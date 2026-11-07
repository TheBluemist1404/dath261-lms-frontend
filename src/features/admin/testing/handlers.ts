import { HttpResponse, http } from "msw";
import type {
	AdminCourse,
	AdminReport,
	ModerationReasonInput,
	ReportHistoryAction,
} from "../types";
import { mockAdminDb } from "./mock-db";

// Mock of the admin moderation API in api/moderation.api.ts. The backend
// moderation contract does not exist yet (issue #22), so these paths are
// placeholders to be replaced, not an agreed contract.

const api = (path: string) => `*/api${path}`;

function error(statusCode: number, message: string) {
	return HttpResponse.json({ statusCode, message }, { status: statusCode });
}

async function readReason(request: Request) {
	const body = (await request.json()) as Partial<ModerationReasonInput>;
	const reason = body.reason?.trim();
	return reason ? { reason, reportId: body.reportId } : null;
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

/** A suspension taken from a pending report resolves it as ACTION_TAKEN. */
function resolveReport(
	reportId: string | undefined,
	action: ReportHistoryAction,
) {
	const report = mockAdminDb.reports.find((entry) => entry.id === reportId);
	if (!report || report.status !== "PENDING") return;
	report.status = "ACTION_TAKEN";
	record(report, action);
}

function findCourse(id: string): AdminCourse | undefined {
	return mockAdminDb.courses.find((course) => course.id === id);
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

	http.get(api("/admin/users"), () => HttpResponse.json(mockAdminDb.users)),

	http.post(api("/admin/users/:id/:action"), async ({ params, request }) => {
		const user = mockAdminDb.users.find((entry) => entry.id === params.id);
		if (!user) return error(404, "User not found");
		const input = await readReason(request);
		if (!input) return error(400, "Reason is required");
		const suspend = params.action === "suspend";
		if (!suspend && params.action !== "restore") return error(404, "Not found");
		user.status = suspend ? "SUSPENDED" : "ACTIVE";
		if (suspend) resolveReport(input.reportId, "USER_SUSPENDED");
		return HttpResponse.json(user);
	}),

	http.get(api("/admin/courses"), () => HttpResponse.json(mockAdminDb.courses)),

	http.post(api("/admin/courses/:id/:action"), async ({ params, request }) => {
		const course = findCourse(String(params.id));
		if (!course) return error(404, "Course not found");
		const input = await readReason(request);
		if (!input) return error(400, "Reason is required");
		const suspend = params.action === "suspend";
		if (!suspend && params.action !== "restore") return error(404, "Not found");
		course.isSuspended = suspend;
		if (suspend) resolveReport(input.reportId, "COURSE_SUSPENDED");
		return HttpResponse.json(course);
	}),
];
