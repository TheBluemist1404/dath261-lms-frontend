import type { CourseBlock } from "./course-block.types";

export type StudentQuestionType =
	| "SINGLE_CHOICE"
	| "MULTIPLE_CHOICE"
	| "TRUE_FALSE"
	| "FILL_IN_BLANK";

export type QuizScoringMode = "HIGHEST" | "LATEST" | "AVERAGE";

export type QuizAttemptStatus = "IN_PROGRESS" | "SUBMITTED" | "GRADED";

export interface StudentQuizOption {
	id: string;
	text: string;
	position: number;
}

export interface StudentQuizQuestion {
	id: string;
	type: StudentQuestionType;
	text: string;
	points: number;
	position: number;
	options: StudentQuizOption[] | null;
}

export interface StudentQuizResponse {
	id: string;
	courseId: string;
	title: string;
	maxAttempts: number;
	scoringMode: QuizScoringMode;
	availableFrom: string | null;
	deadline: string | null;
	allowLate: boolean;
	resultsReleasedAt: string | null;
	questions: StudentQuizQuestion[];
}

export interface SubmitAnswerInput {
	questionId: string;
	selectedOptionIds?: string[];
	textAnswer?: string;
	booleanAnswer?: boolean;
}

export interface SubmitQuizAttemptInput {
	answers: SubmitAnswerInput[];
}

export interface StudentAttemptAnswerResult {
	questionId: string;
	points: number;
	earnedPoints: number;
	isCorrect: boolean;
	correctAnswer: unknown;
	studentAnswer: unknown;
}

export interface QuizAttemptResponse {
	id: string;
	courseBlockId: string;
	attemptNumber: number;
	status: QuizAttemptStatus;
	score: number | null;
	isLate: boolean;
	submittedAt: string | null;
	resultsReleased: boolean;
	answers: StudentAttemptAnswerResult[] | null;
}

export type QuizTakeState =
	| { kind: "not_available_yet"; availableFrom: string }
	| { kind: "past_deadline_blocked"; deadline: string }
	| { kind: "no_attempts_left"; maxAttempts: number; attemptsUsed: number }
	| {
			kind: "available";
			isLate: boolean;
			attemptsUsed: number;
			attemptsRemaining: number;
	  };

export type AttemptReviewState =
	| { kind: "withheld" }
	| { kind: "released"; answers: StudentAttemptAnswerResult[] };

export type DraftQuestionAnswer =
	| { type: "SINGLE_CHOICE"; optionId: string }
	| { type: "MULTIPLE_CHOICE"; optionIds: string[] }
	| { type: "TRUE_FALSE"; value: boolean }
	| { type: "FILL_IN_BLANK"; text: string };

export type OutlineNode =
	| { kind: "module"; block: CourseBlock; children: CourseBlock[] }
	| { kind: "block"; block: CourseBlock };
