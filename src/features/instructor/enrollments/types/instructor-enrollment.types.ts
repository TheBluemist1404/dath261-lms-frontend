import type { EnrollmentStatus } from "@/features/courses/types/enrollment.types";

export type { EnrollmentStatus };

export interface RosterStudent {
	id: string;
	firstName: string | null;
	lastName: string | null;
	email: string;
}

export interface RosterProgress {
	completedBlocks: number;
	totalBlocks: number;
	percent: number;
}

export interface EnrollmentRosterItem {
	enrollmentId: string;
	status: EnrollmentStatus;
	enrolledAt: string;
	completedAt: string | null;
	student: RosterStudent;
	progress: RosterProgress;
	quizScore: number | null;
}

export interface EnrollmentRosterMeta {
	total: number;
	page: number;
	limit: number;
	totalPages: number;
	hasNextPage: boolean;
	hasPrevPage: boolean;
}

export interface EnrollmentRosterResponse {
	data: EnrollmentRosterItem[];
	meta: EnrollmentRosterMeta;
}

export interface RosterQuery {
	status?: EnrollmentStatus;
	search?: string;
	page?: number;
	limit?: number;
}

export interface LecturerStudentProgress {
	enrollment: {
		id: string;
		status: EnrollmentStatus;
		enrolledAt: string;
		leftAt: string | null;
		completedAt: string | null;
	};
	student: RosterStudent;
	progress: {
		totalItems: number;
		completedItems: number;
		learningProgressPercentage: number;
		totalQuizzes: number;
		completedQuizzes: number;
		quizCompletionPercentage: number;
	};
	items: LecturerBlockProgressItem[];
	quizAttempts: LecturerQuizAttempt[];
	assignmentSubmissions: LecturerAssignmentSubmission[];
}

export interface LecturerBlockProgressItem {
	courseBlockId: string;
	type: string;
	title: string;
	position: number;
	parentModuleId: string | null;
	completed: boolean;
	completedAt: string | null;
}

export interface LecturerQuizAttempt {
	id: string;
	courseBlockId: string;
	attemptNumber: number;
	status: string;
	answers: unknown;
	score: string | null;
	startedAt: string;
	submittedAt: string | null;
	gradedAt: string | null;
	quizBlock: { title: string };
}

export interface LecturerAssignmentSubmission {
	id: string;
	courseBlockId: string;
	attemptNumber: number;
	textContent: string | null;
	fileMetadata: unknown;
	status: string;
	score: string | null;
	feedback: string | null;
	submittedAt: string;
	gradedAt: string | null;
	assignmentBlock: { title: string };
}

export interface EnrollmentCompletionResponse {
	enrollmentId: string;
	status: EnrollmentStatus;
	completedAt: string;
}
