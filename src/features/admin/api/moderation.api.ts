import { httpClient } from "@/lib/http/client";
import type {
	AdminCourse,
	AdminReport,
	AdminUser,
	PagedResponse,
	UpdateCourseSuspensionInput,
	UpdateUserStatusInput,
} from "../types";

// Users and courses use the backend admin routes (BE PR #36). Reports have no
// backend endpoints yet, so their paths are mock placeholders served by MSW.

const id = (value: string) => encodeURIComponent(value);

export async function listReports(signal?: AbortSignal) {
	const { data } = await httpClient.get<AdminReport[]>("/admin/reports", {
		signal,
	});
	return data;
}

export async function getReport(reportId: string, signal?: AbortSignal) {
	const { data } = await httpClient.get<AdminReport>(
		`/admin/reports/${id(reportId)}`,
		{ signal },
	);
	return data;
}

export async function dismissReport(reportId: string, reason: string) {
	const { data } = await httpClient.post<AdminReport>(
		`/admin/reports/${id(reportId)}/dismiss`,
		{ reason },
	);
	return data;
}

/** Mock only: records that action was taken on the report's target. */
export async function resolveReport(reportId: string, reason: string) {
	const { data } = await httpClient.post<AdminReport>(
		`/admin/reports/${id(reportId)}/resolve`,
		{ reason },
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
