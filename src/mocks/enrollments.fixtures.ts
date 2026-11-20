import type {
	DeadlineResponseDto,
	EnrollmentStateResponseDto,
	MyCourseItemDto,
	PaginatedMyCoursesResponseDto,
	ResumePositionResponseDto,
	StudentProgressResponseDto,
} from "@/features/courses/types/enrollment.types";
import type {
	EnrollmentRosterResponse,
	LecturerStudentProgress,
} from "@/features/instructor/enrollments/types/instructor-enrollment.types";

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
export const mockRoster: EnrollmentRosterResponse = {
	data: [
		{
			enrollmentId: "enrollment-1",
			status: "ACTIVE",
			enrolledAt: "2026-10-01T08:00:00.000Z",
			completedAt: null,

			student: {
				id: "student-1",
				firstName: "Nguyen",
				lastName: "An",
				email: "an@example.com",
			},

			progress: {
				completedBlocks: 6,
				totalBlocks: 10,
				percent: 60,
			},

			quizScore: 85.5,
		},

		{
			enrollmentId: "enrollment-2",
			status: "COMPLETED",
			enrolledAt: "2026-09-01T08:00:00.000Z",
			completedAt: "2026-11-01T08:00:00.000Z",

			student: {
				id: "student-2",
				firstName: "Tran",
				lastName: "Binh",
				email: "binh@example.com",
			},

			progress: {
				completedBlocks: 10,
				totalBlocks: 10,
				percent: 100,
			},

			quizScore: 92,
		},
	],

	meta: {
		total: 2,
		page: 1,
		limit: 20,
		totalPages: 1,
		hasNextPage: false,
		hasPrevPage: false,
	},
};

export const mockLecturerStudentProgress: LecturerStudentProgress = {
	enrollment: {
		id: "enrollment-1",
		status: "ACTIVE",
		enrolledAt: "2026-10-01T08:00:00.000Z",
		leftAt: null,
		completedAt: null,
	},
	student: {
		id: "student-1",
		firstName: "Nguyen",
		lastName: "An",
		email: "an@example.com",
	},
	progress: {
		totalItems: 10,
		completedItems: 6,
		learningProgressPercentage: 60,
		totalQuizzes: 3,
		completedQuizzes: 2,
		quizCompletionPercentage: 66.67,
	},
	items: [
		{
			courseBlockId: "block-1",
			type: "TEXT",
			title: "Introduction",
			position: 1,
			parentModuleId: null,
			completed: true,
			completedAt: "2026-10-02T08:00:00.000Z",
		},
		{
			courseBlockId: "block-2",
			type: "VIDEO",
			title: "Lecture 1",
			position: 2,
			parentModuleId: null,
			completed: false,
			completedAt: null,
		},
	],
	quizAttempts: [
		{
			id: "attempt-1",
			courseBlockId: "quiz-1",
			attemptNumber: 1,
			status: "GRADED",
			answers: {},
			score: "85.50",
			startedAt: "2026-10-03T08:00:00.000Z",
			submittedAt: "2026-10-03T08:20:00.000Z",
			gradedAt: "2026-10-03T08:30:00.000Z",
			quizBlock: { title: "Quiz 1" },
		},
	],
	assignmentSubmissions: [],
};

const DAY_MS = 86_400_000;

export function createMockUpcomingDeadlines(
	nowMs = Date.now(),
): DeadlineResponseDto[] {
	return [
		{
			courseId: "course-intro-cs",
			courseTitle: "Introduction to Computer Science",
			blockId: "block-1-3",
			title: "System Call Knowledge Check",
			deadline: new Date(nowMs + 2 * DAY_MS).toISOString(),
			allowLate: false,
			attemptsUsed: 0,
			maxAttempts: 3,
		},
		{
			courseId: "course-intro-cs",
			courseTitle: "Introduction to Computer Science",
			blockId: "block-2-1",
			title: "Process Scheduling Quiz",
			deadline: new Date(nowMs + 6 * DAY_MS).toISOString(),
			allowLate: true,
			attemptsUsed: 1,
			maxAttempts: 3,
		},
		{
			courseId: "course-intro-cs",
			courseTitle: "Introduction to Computer Science",
			blockId: "block-3-1",
			title: "Virtual Memory Quiz",
			deadline: new Date(nowMs + 20 * DAY_MS).toISOString(),
			allowLate: false,
			attemptsUsed: 0,
			maxAttempts: 2,
		},
	];
}
