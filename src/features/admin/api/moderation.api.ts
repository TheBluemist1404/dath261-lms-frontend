import { httpClient } from "@/lib/http/client";
import type {
	AdminCourse,
	AdminReport,
	AdminReportItem,
	AdminUser,
	PagedResponse,
	PlatformStats,
	UpdateCourseSuspensionInput,
	UpdateReportStatusInput,
	UpdateUserStatusInput,
} from "../types";

// Admin API. Users and courses use the backend admin routes (BE PR #36);
// reports use the backend report review routes (BE PR #43, backend issue #41);
// the overview uses the stats route (BE PR #51, backend issue #48).

const id = (value: string) => encodeURIComponent(value);

export async function listReports(signal?: AbortSignal) {
	const { data } = await httpClient.get<PagedResponse<AdminReportItem>>(
		"/admin/reports",
		{ signal },
	);
	return data;
}

export async function getReport(reportId: string, signal?: AbortSignal) {
	const { data } = await httpClient.get<AdminReport>(
		`/admin/reports/${id(reportId)}`,
		{ signal },
	);
	return data;
}

/** Dismisses a report or marks that action was taken on its target. */
export async function updateReportStatus(
	reportId: string,
	input: UpdateReportStatusInput,
) {
	const { data } = await httpClient.patch<AdminReportItem>(
		`/admin/reports/${id(reportId)}/status`,
		input,
	);
	return data;
}

export async function listAdminUsers(signal?: AbortSignal) {
	const { data } = await httpClient.get<PagedResponse<AdminUser>>(
		"/admin/users",
		{ signal },
	);
	return data;
}

export async function updateUserStatus(
	userId: string,
	input: UpdateUserStatusInput,
) {
	const { data } = await httpClient.patch<AdminUser>(
		`/admin/users/${id(userId)}/status`,
		input,
	);
	return data;
}

export async function listAdminCourses(signal?: AbortSignal) {
	const { data } = await httpClient.get<PagedResponse<AdminCourse>>(
		"/admin/courses",
		{ signal },
	);
	return data;
}

export async function updateCourseSuspension(
	courseId: string,
	input: UpdateCourseSuspensionInput,
) {
	const { data } = await httpClient.patch<AdminCourse>(
		`/admin/courses/${id(courseId)}/suspension`,
		input,
	);
	return data;
}

export async function getPlatformStats(signal?: AbortSignal) {
	const { data } = await httpClient.get<PlatformStats>("/admin/stats", {
		signal,
	});
	return data;
}

/**
 * Number of reports waiting for review. The backend calls this status PENDING
 * (the UI label is "Open"); a page of one item is enough to read `total`.
 */
export async function countOpenReports(signal?: AbortSignal) {
	const { data } = await httpClient.get<PagedResponse<AdminReportItem>>(
		"/admin/reports",
		{ params: { status: "PENDING", pageSize: 1 }, signal },
	);
	return data.total;
}
