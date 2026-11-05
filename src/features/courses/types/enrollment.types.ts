export type EnrollmentStatus = "ACTIVE" | "LEFT" | "COMPLETED";
export type LearnerCourseState = "IN_PROGRESS" | "UNAVAILABLE" | "COMPLETED";

export interface EnrollmentActionResponseDto {
	enrollmentId: string;
	courseId: string;
	status: EnrollmentStatus;
	canAccessCourse: boolean;
}

export interface EnrollmentStateResponseDto {
	courseId: string;
	enrollmentId: string | null;
	enrollmentStatus: EnrollmentStatus | null;
	courseAvailable: boolean;
	canAccessCourse: boolean;
}

export interface EnrollmentCourseSummaryDto {
	id: string;
	title: string;
	status: "DRAFT" | "PUBLISHED";
	isSuspended: boolean;
}

export interface MyCourseEnrollmentResponseDto {
	enrollmentId: string;
	courseId: string;
	status: EnrollmentStatus;
	state: LearnerCourseState;
	courseAvailable: boolean;
	canAccessCourse: boolean;
	course: EnrollmentCourseSummaryDto;
}

export type MyCourseItemDto = MyCourseEnrollmentResponseDto;

export interface PaginationMetaDto {
	total: number;
	page: number;
	limit: number;
	totalPages: number;
	hasNextPage: boolean;
	hasPreviousPage: boolean;
	hasPrevPage?: boolean;
}

export interface PaginatedMyCoursesResponseDto {
	data: MyCourseItemDto[];
	meta: PaginationMetaDto;
}

export interface ResumePositionResponseDto {
	hasResumePosition: boolean;
	lastVisitedAt: string | null;
	block: {
		id: string;
		type: "TEXT" | "VIDEO" | "QUIZ";
		title: string;
		position: number;
		parentModuleId: string | null;
	} | null;
	resumeData: {
		version: number;
		type: string;
		data: {
			positionSeconds?: number;
			[key: string]: unknown;
		};
	} | null;
}

export interface StudentProgressResponseDto {
	enrollmentId: string;
	enrollmentStatus: EnrollmentStatus;
	progress: {
		totalItems: number;
		completedItems: number;
		learningProgressPercentage: number;
		totalQuizzes: number;
		completedQuizzes: number;
		quizCompletionPercentage: number;
	};
}
