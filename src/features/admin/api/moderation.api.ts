import { httpClient } from "@/lib/http/client";
import type {
	AdminCourse,
	AdminReport,
	AdminUser,
	ModerationReasonInput,
} from "../types";

// Mock contract only: the backend has not published admin moderation
// endpoints yet (issue #22). Every admin request goes through this file so the
// real paths can be swapped in one place once the contract is agreed.

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

export async function listAdminUsers(signal?: AbortSignal) {
	const { data } = await httpClient.get<AdminUser[]>("/admin/users", {
		signal,
	});
	return data;
}

export async function setUserSuspended(
	userId: string,
	suspended: boolean,
	input: ModerationReasonInput,
) {
	const { data } = await httpClient.post<AdminUser>(
		`/admin/users/${id(userId)}/${suspended ? "suspend" : "restore"}`,
		input,
	);
	return data;
}

export async function listAdminCourses(signal?: AbortSignal) {
	const { data } = await httpClient.get<AdminCourse[]>("/admin/courses", {
		signal,
	});
	return data;
}

export async function setCourseSuspended(
	courseId: string,
	suspended: boolean,
	input: ModerationReasonInput,
) {
	const { data } = await httpClient.post<AdminCourse>(
		`/admin/courses/${id(courseId)}/${suspended ? "suspend" : "restore"}`,
		input,
	);
	return data;
}
