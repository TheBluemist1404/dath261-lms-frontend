import { queryOptions } from "@tanstack/react-query";
import {
	getReport,
	listAdminCourses,
	listAdminUsers,
	listReports,
} from "./moderation.api";

/** Every admin query starts with this key, so one invalidation refreshes them all. */
export const adminKey = ["admin"] as const;

export const reportListQuery = () =>
	queryOptions({
		queryKey: [...adminKey, "reports"],
		queryFn: ({ signal }) => listReports(signal),
	});

export const reportQuery = (reportId: string) =>
	queryOptions({
		queryKey: [...adminKey, "reports", reportId],
		queryFn: ({ signal }) => getReport(reportId, signal),
	});

export const adminUserListQuery = () =>
	queryOptions({
		queryKey: [...adminKey, "users"],
		queryFn: ({ signal }) => listAdminUsers(signal),
	});

export const adminCourseListQuery = () =>
	queryOptions({
		queryKey: [...adminKey, "courses"],
		queryFn: ({ signal }) => listAdminCourses(signal),
	});
