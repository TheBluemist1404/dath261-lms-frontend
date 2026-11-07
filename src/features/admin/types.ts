// Admin moderation shapes (issue #22, Figma AD-02 to AD-05).
//
// The backend has no admin moderation endpoints yet. Statuses reuse the
// backend enums that already exist (Report.status, AccountStatus,
// Course.isSuspended); everything else is the mock contract served by
// testing/handlers.ts and must be replaced once the backend contract is agreed.

import type { AccountStatusDto, UserRoleDto } from "@/features/auth/types";
import type { Course } from "@/features/courses/types/course.types";
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

export interface AdminUser {
	id: string;
	firstName: string;
	lastName: string;
	email: string;
	role: UserRoleDto;
	status: AccountStatusDto;
	createdAt: string;
}

export type AdminCourse = Pick<
	Course,
	"id" | "title" | "status" | "enrollmentCount"
> & {
	lecturer: PersonRef;
	isSuspended: boolean;
};

export interface ModerationReasonInput {
	reason: string;
	/** Set when the action is taken from a report review. */
	reportId?: string;
}
