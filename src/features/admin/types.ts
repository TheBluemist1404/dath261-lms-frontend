// Admin moderation shapes (issue #22, Figma AD-02 to AD-05).
//
// Users and courses follow the backend admin module (BE PR #36). Reports have
// no backend endpoints yet, so their shapes are the mock contract served by
// testing/handlers.ts.

import type { AccountStatusDto, UserRoleDto } from "@/features/auth/types";
import type { CourseStatus } from "@/features/courses/types/course.types";
import type { Report } from "@/features/workspace/types";

export type { AccountStatusDto, UserRoleDto };

/** Backend Report.status: PENDING | DISMISSED | ACTION_TAKEN. */
export type ReportStatus = Report["status"];

/** Report targets shown in Figma AD-04/AD-05: course, user account, shared message. */
export type ReportTargetType = "COURSE" | "USER" | "MESSAGE";

export interface PersonRef {
	id: string;
	name: string;
}

export type ReportHistoryAction =
	| "RECEIVED"
	| "DISMISSED"
	| "COURSE_SUSPENDED"
	| "USER_SUSPENDED";

export interface ReportHistoryEntry {
	id: string;
	action: ReportHistoryAction;
	actor: PersonRef;
	createdAt: string;
	reasonRecorded: boolean;
}

export interface AdminReport {
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
	/** Only for MESSAGE targets: the reported message and its scoped context. */
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

/** BE PR #36 body of PATCH /admin/courses/:courseId/suspension. */
export interface UpdateCourseSuspensionInput {
	suspended: boolean;
	reason?: string;
}
