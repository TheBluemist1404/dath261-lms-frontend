// Admin moderation shapes (issue #22, Figma AD-02 to AD-05).
//
// Users and courses follow the backend admin module (BE PR #36). Reports follow
// the backend report review API (BE PR #43, backend issue #41).

import type { AccountStatusDto, UserRoleDto } from "@/features/auth/types";
import type { CourseStatus } from "@/features/courses/types/course.types";
import type { Report } from "@/features/workspace/types";

export type { AccountStatusDto, UserRoleDto };

/** Backend Report.status: PENDING | DISMISSED | ACTION_TAKEN. */
export type ReportStatus = Report["status"];

/** BE PR #43 ReportTargetType. */
export type ReportTargetType =
	| "USER"
	| "COURSE"
	| "COURSE_BLOCK"
	| "PAGE"
	| "MESSAGE"
	| "WORKSPACE";

export interface PersonRef {
	id: string;
	name: string;
}

/** BE PR #43 AdminReportHistoryAction. */
export type ReportHistoryAction =
	| "RECEIVED"
	| "DISMISSED"
	| "ACTION_TAKEN"
	| "COURSE_SUSPENDED"
	| "USER_SUSPENDED";

/** BE PR #43 AdminReportHistoryItemDto. */
export interface ReportHistoryEntry {
	id: string;
	action: ReportHistoryAction;
	actor: PersonRef;
	createdAt: string;
	reasonRecorded: string | null;
}

/** BE PR #43 AdminReportItemDto: one row of GET /admin/reports. */
export interface AdminReportItem {
	id: string;
	status: ReportStatus;
	reason: string;
	description: string | null;
	createdAt: string;
	reporter: PersonRef;
	target: {
		type: ReportTargetType;
		id: string;
		name: string;
		/** False when the target was removed; only retained metadata is shown. */
		available: boolean;
	};
}

/** BE PR #43 AdminReportDetailDto: GET /admin/reports/:reportId. */
export interface AdminReport extends AdminReportItem {
	/** Only for MESSAGE targets that still exist. */
	message?: {
		location: string;
		author: PersonRef;
		content: string;
	};
	history: ReportHistoryEntry[];
}

/** BE PR #36 AdminUserItemDto. */
export interface AdminUser {
	id: string;
	email: string;
	firstName: string | null;
	lastName: string | null;
	role: UserRoleDto;
	status: AccountStatusDto;
	createdAt: string;
}

/** BE PR #36 AdminCourseItemDto. */
export interface AdminCourse {
	id: string;
	title: string;
	status: CourseStatus;
	isSuspended: boolean;
	lecturer: PersonRef;
	enrollmentCount: number;
	createdAt: string;
}

/** BE PR #36 paged list response for GET /admin/users and /admin/courses. */
export interface PagedResponse<T> {
	items: T[];
	page: number;
	pageSize: number;
	total: number;
}

/** BE PR #36 body of PATCH /admin/users/:userId/status. */
export interface UpdateUserStatusInput {
	status: AccountStatusDto;
	reason?: string;
}

/** BE PR #43 body of PATCH /admin/reports/:reportId/status. */
export interface UpdateReportStatusInput {
	status: "DISMISSED" | "ACTION_TAKEN";
	reason: string;
}

/** BE PR #36 body of PATCH /admin/courses/:courseId/suspension. */
export interface UpdateCourseSuspensionInput {
	suspended: boolean;
	reason?: string;
}
