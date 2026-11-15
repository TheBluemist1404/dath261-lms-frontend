import type {
	EnrollmentStateResponseDto,
	MyCourseItemDto,
	PaginatedMyCoursesResponseDto,
	ResumePositionResponseDto,
	StudentProgressResponseDto,
} from "@/features/courses/types/enrollment.types";

export const mockEnrollmentNone: EnrollmentStateResponseDto = {
	courseId: "course-os",
	enrollmentId: null,
	enrollmentStatus: null,
	courseAvailable: true,
	canAccessCourse: false,
};

export const mockEnrollmentActive: EnrollmentStateResponseDto = {
	courseId: "course-intro-cs",
	enrollmentId: "enrollment-1",
	enrollmentStatus: "ACTIVE",
	courseAvailable: true,
	canAccessCourse: true,
};

export const mockEnrollmentLeft: EnrollmentStateResponseDto = {
	courseId: "course-db",
	enrollmentId: "enrollment-2",
	enrollmentStatus: "LEFT",
	courseAvailable: true,
	canAccessCourse: false,
};

export const mockEnrollmentCompleted: EnrollmentStateResponseDto = {
	courseId: "course-algo",
	enrollmentId: "enrollment-3",
	enrollmentStatus: "COMPLETED",
	courseAvailable: true,
	canAccessCourse: true,
};

export const mockEnrollmentUnavailable: EnrollmentStateResponseDto = {
	courseId: "course-draft-os",
	enrollmentId: "enrollment-4",
	enrollmentStatus: "ACTIVE",
	courseAvailable: false,
	canAccessCourse: false,
};

export const mockMyCoursesItems: MyCourseItemDto[] = [
	{
		enrollmentId: "enrollment-1",
		courseId: "course-intro-cs",
		status: "ACTIVE",
		state: "IN_PROGRESS",
		courseAvailable: true,
		canAccessCourse: true,
		course: {
			id: "course-intro-cs",
			title: "Introduction to Computer Science",
			status: "PUBLISHED",
			isSuspended: false,
		},
	},
	{
		enrollmentId: "enrollment-4",
		courseId: "course-draft-os",
		status: "ACTIVE",
		state: "UNAVAILABLE",
		courseAvailable: false,
		canAccessCourse: false,
		course: {
			id: "course-draft-os",
			title: "Advanced Operating Systems Lab",
			status: "DRAFT",
			isSuspended: false,
		},
	},
	{
		enrollmentId: "enrollment-3",
		courseId: "course-algo",
		status: "COMPLETED",
		state: "COMPLETED",
		courseAvailable: true,
		canAccessCourse: true,
		course: {
			id: "course-algo",
			title: "Data Structures & Algorithms",
			status: "PUBLISHED",
			isSuspended: false,
		},
	},
];

export const mockMyCoursesList: PaginatedMyCoursesResponseDto = {
	data: mockMyCoursesItems,
	meta: {
		total: mockMyCoursesItems.length,
		page: 1,
		limit: 10,
		totalPages: 1,
		hasNextPage: false,
		hasPrevPage: false,
		hasPreviousPage: false,
	},
};

export const mockResumePosition: ResumePositionResponseDto = {
	hasResumePosition: true,
	lastVisitedAt: "2026-10-20T14:30:00.000Z",
	block: {
		id: "block-video-1",
		type: "VIDEO",
		title: "Lecture 1: Computational Thinking",
		position: 1,
		parentModuleId: "mod-1",
	},
	resumeData: {
		version: 1,
		type: "VIDEO",
		data: {
			positionSeconds: 142,
		},
	},
};

export const mockStudentProgress: StudentProgressResponseDto = {
	enrollmentId: "enrollment-1",
	enrollmentStatus: "ACTIVE",
	progress: {
		totalItems: 10,
		completedItems: 6,
		learningProgressPercentage: 60,
		totalQuizzes: 3,
		completedQuizzes: 2,
		quizCompletionPercentage: 66,
	},
};
