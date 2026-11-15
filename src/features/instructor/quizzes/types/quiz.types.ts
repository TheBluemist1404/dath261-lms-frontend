export type QuestionType =
	| "SINGLE_CHOICE"
	| "MULTIPLE_CHOICE"
	| "TRUE_FALSE"
	| "FILL_IN_BLANK";

export type ScoringMode = "HIGHEST" | "LATEST" | "AVERAGE";

export interface QuizOptionInput {
	text: string;
	isCorrect: boolean;
}

export interface QuizQuestionInput {
	type: QuestionType;
	text: string;
	points?: number;

	options?: QuizOptionInput[];

	correctBoolean?: boolean;

	acceptedAnswers?: string[];
}

export interface QuizCreateInput {
	title: string;
	maxAttempts?: number;
	scoringMode?: ScoringMode;
	availableFrom?: string | null;
	deadline?: string | null;
	allowLate?: boolean;
	questions: QuizQuestionInput[];
}

export interface QuizConfigUpdateInput {
	maxAttempts?: number;
	scoringMode?: ScoringMode;
	availableFrom?: string | null;
	deadline?: string | null;
	allowLate?: boolean;
}

export interface QuizOptionResponse {
	id: string;
	text: string;
	isCorrect: boolean;
	position: number;
}

export interface QuizQuestionResponse {
	id: string;
	type: QuestionType;
	text: string;
	points: number;
	position: number;

	options: QuizOptionResponse[] | null;

	correctBoolean: boolean | null;

	acceptedAnswers: string[] | null;
}

export interface QuizResponse {
	id: string;
	courseId: string;
	title: string;

	maxAttempts: number;
	scoringMode: ScoringMode;

	availableFrom: string | null;
	deadline: string | null;
	allowLate: boolean;

	resultsReleasedAt: string | null;

	questions: QuizQuestionResponse[];

	createdAt: string;
	updatedAt: string;
}
