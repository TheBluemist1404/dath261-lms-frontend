import { describe, expect, it } from "vitest";
import type { CourseBlock } from "../types/course-block.types";
import type {
	DraftQuestionAnswer,
	QuizAttemptResponse,
	StudentQuizQuestion,
	StudentQuizResponse,
} from "../types/student-quiz.types";
import {
	buildSubmitAnswersPayload,
	computeAggregatedQuizScore,
	countAnsweredQuestions,
	flattenLearnContentBlocks,
	formatCorrectAnswerText,
	formatStudentAnswerText,
	isQuestionAnswered,
	organizeCourseOutlineBlocks,
	resolveAttemptReviewState,
	resolveQuizTakeState,
} from "./student-quiz-domain";

const baseQuiz: StudentQuizResponse = {
	id: "quiz-1",
	courseId: "course-os",
	title: "System Calls",
	maxAttempts: 3,
	scoringMode: "HIGHEST",
	availableFrom: null,
	deadline: null,
	allowLate: false,
	resultsReleasedAt: null,
	questions: [],
};

const sampleQuestions: StudentQuizQuestion[] = [
	{
		id: "q-4",
		type: "FILL_IN_BLANK",
		text: "Mode name?",
		points: 25,
		position: 4,
		options: null,
	},
	{
		id: "q-1",
		type: "SINGLE_CHOICE",
		text: "Creates process?",
		points: 25,
		position: 1,
		options: [
			{ id: "opt-1", text: "execve()", position: 1 },
			{ id: "opt-2", text: "fork()", position: 2 },
		],
	},
	{
		id: "q-3",
		type: "TRUE_FALSE",
		text: "User code edits page tables directly?",
		points: 25,
		position: 3,
		options: null,
	},
	{
		id: "q-2",
		type: "MULTIPLE_CHOICE",
		text: "Kernel transitions?",
		points: 25,
		position: 2,
		options: [
			{ id: "opt-a", text: "Syscall trap", position: 1 },
			{ id: "opt-b", text: "Timer interrupt", position: 2 },
			{ id: "opt-c", text: "Local addition", position: 3 },
		],
	},
];

function makeAttempt(
	overrides: Partial<QuizAttemptResponse> = {},
): QuizAttemptResponse {
	return {
		id: "att-1",
		courseBlockId: "quiz-1",
		attemptNumber: 1,
		status: "GRADED",
		score: 80,
		isLate: false,
		submittedAt: "2026-10-10T10:00:00.000Z",
		resultsReleased: false,
		answers: null,
		...overrides,
	};
}

describe("resolveQuizTakeState", () => {
	const nowMs = Date.parse("2026-11-10T12:00:00.000Z");

	it("returns not_available_yet when availableFrom is in the future", () => {
		const quiz: StudentQuizResponse = {
			...baseQuiz,
			availableFrom: "2026-11-11T00:00:00.000Z",
		};

		expect(resolveQuizTakeState(quiz, 0, nowMs)).toEqual({
			kind: "not_available_yet",
			availableFrom: "2026-11-11T00:00:00.000Z",
		});
	});

	it("returns past_deadline_blocked when deadline passed and allowLate is false", () => {
		const quiz: StudentQuizResponse = {
			...baseQuiz,
			deadline: "2026-11-09T23:59:59.000Z",
			allowLate: false,
		};

		expect(resolveQuizTakeState(quiz, 1, nowMs)).toEqual({
			kind: "past_deadline_blocked",
			deadline: "2026-11-09T23:59:59.000Z",
		});
	});

	it("returns no_attempts_left when attemptsUsed reaches maxAttempts", () => {
		const quiz: StudentQuizResponse = {
			...baseQuiz,
			maxAttempts: 2,
			deadline: "2026-11-09T00:00:00.000Z",
			allowLate: true,
		};

		expect(resolveQuizTakeState(quiz, 2, nowMs)).toEqual({
			kind: "no_attempts_left",
			maxAttempts: 2,
			attemptsUsed: 2,
		});
	});

	it("returns available with isLate true when deadline passed and allowLate is true", () => {
		const quiz: StudentQuizResponse = {
			...baseQuiz,
			maxAttempts: 3,
			deadline: "2026-11-09T00:00:00.000Z",
			allowLate: true,
		};

		expect(resolveQuizTakeState(quiz, 1, nowMs)).toEqual({
			kind: "available",
			isLate: true,
			attemptsUsed: 1,
			attemptsRemaining: 2,
		});
	});

	it("returns available with isLate false before deadline", () => {
		const quiz: StudentQuizResponse = {
			...baseQuiz,
			availableFrom: "2026-11-01T00:00:00.000Z",
			deadline: "2026-11-12T00:00:00.000Z",
			allowLate: false,
		};

		expect(resolveQuizTakeState(quiz, 0, nowMs)).toEqual({
			kind: "available",
			isLate: false,
			attemptsUsed: 0,
			attemptsRemaining: 3,
		});
	});
});

describe("resolveAttemptReviewState", () => {
	it("returns withheld when resultsReleased is false or answers is null", () => {
		expect(
			resolveAttemptReviewState(makeAttempt({ resultsReleased: false })),
		).toEqual({ kind: "withheld" });

		expect(
			resolveAttemptReviewState(
				makeAttempt({ resultsReleased: true, answers: null }),
			),
		).toEqual({ kind: "withheld" });
	});

	it("returns released with answers when resultsReleased is true and answers exist", () => {
		const answers = [
			{
				questionId: "q-1",
				points: 25,
				earnedPoints: 25,
				isCorrect: true,
				correctAnswer: ["opt-2"],
				studentAnswer: ["opt-2"],
			},
		];

		expect(
			resolveAttemptReviewState(
				makeAttempt({ resultsReleased: true, answers }),
			),
		).toEqual({
			kind: "released",
			answers,
		});
	});
});

describe("computeAggregatedQuizScore", () => {
	it("returns null when no scored attempts exist", () => {
		expect(computeAggregatedQuizScore([], "HIGHEST")).toBeNull();
		expect(
			computeAggregatedQuizScore(
				[makeAttempt({ status: "IN_PROGRESS", score: null })],
				"AVERAGE",
			),
		).toBeNull();
	});

	it("computes HIGHEST score while skipping null scores", () => {
		const attempts = [
			makeAttempt({ id: "a1", attemptNumber: 1, score: 65 }),
			makeAttempt({ id: "a2", attemptNumber: 2, score: 92.5 }),
			makeAttempt({ id: "a3", attemptNumber: 3, score: null }),
		];

		expect(computeAggregatedQuizScore(attempts, "HIGHEST")).toBe(92.5);
	});

	it("computes LATEST score by highest attemptNumber while skipping null scores", () => {
		const attempts = [
			makeAttempt({ id: "a3", attemptNumber: 3, score: null }),
			makeAttempt({ id: "a1", attemptNumber: 1, score: 95 }),
			makeAttempt({ id: "a2", attemptNumber: 2, score: 70 }),
		];

		expect(computeAggregatedQuizScore(attempts, "LATEST")).toBe(70);
	});

	it("computes AVERAGE score rounded HALF_UP to 2 decimals", () => {
		const repeatingAttempts = [
			makeAttempt({ id: "a1", attemptNumber: 1, score: 100 }),
			makeAttempt({ id: "a2", attemptNumber: 2, score: 50 }),
			makeAttempt({ id: "a3", attemptNumber: 3, score: 50 }),
		];
		expect(computeAggregatedQuizScore(repeatingAttempts, "AVERAGE")).toBe(
			66.67,
		);

		const halfUpAttempts = [
			makeAttempt({ id: "b1", attemptNumber: 1, score: 1.005 }),
			makeAttempt({ id: "b2", attemptNumber: 2, score: 1.005 }),
		];
		expect(computeAggregatedQuizScore(halfUpAttempts, "AVERAGE")).toBe(1.01);
	});
});

describe("draft answering helpers", () => {
	it("checks individual answer completeness across all four question types", () => {
		expect(isQuestionAnswered(undefined)).toBe(false);
		expect(isQuestionAnswered({ type: "SINGLE_CHOICE", optionId: "" })).toBe(
			false,
		);
		expect(
			isQuestionAnswered({ type: "SINGLE_CHOICE", optionId: "opt-2" }),
		).toBe(true);
		expect(isQuestionAnswered({ type: "MULTIPLE_CHOICE", optionIds: [] })).toBe(
			false,
		);
		expect(
			isQuestionAnswered({ type: "MULTIPLE_CHOICE", optionIds: ["opt-a"] }),
		).toBe(true);
		expect(isQuestionAnswered({ type: "TRUE_FALSE", value: false })).toBe(true);
		expect(isQuestionAnswered({ type: "FILL_IN_BLANK", text: "   " })).toBe(
			false,
		);
		expect(isQuestionAnswered({ type: "FILL_IN_BLANK", text: "kernel" })).toBe(
			true,
		);
	});

	it("counts only valid matching drafts and builds position-sorted submit payload", () => {
		const drafts: Record<string, DraftQuestionAnswer> = {
			"q-4": { type: "FILL_IN_BLANK", text: "  kernel mode  " },
			"q-1": { type: "SINGLE_CHOICE", optionId: "opt-2" },
			"q-3": { type: "TRUE_FALSE", value: false },
			"q-2": { type: "SINGLE_CHOICE", optionId: "mismatched" },
		};

		expect(countAnsweredQuestions(sampleQuestions, drafts)).toBe(3);

		expect(buildSubmitAnswersPayload(sampleQuestions, drafts)).toEqual({
			answers: [
				{ questionId: "q-1", selectedOptionIds: ["opt-2"] },
				{ questionId: "q-3", booleanAnswer: false },
				{ questionId: "q-4", textAnswer: "kernel mode" },
			],
		});

		const multiDrafts: Record<string, DraftQuestionAnswer> = {
			"q-2": { type: "MULTIPLE_CHOICE", optionIds: ["opt-a", "opt-b"] },
		};
		expect(buildSubmitAnswersPayload(sampleQuestions, multiDrafts)).toEqual({
			answers: [{ questionId: "q-2", selectedOptionIds: ["opt-a", "opt-b"] }],
		});
	});
});

describe("answer formatting helpers", () => {
	it("formats choice, boolean, text, and missing values into readable text", () => {
		const singleQ = sampleQuestions[1];
		const multiQ = sampleQuestions[3];
		const tfQ = sampleQuestions[2];
		const blankQ = sampleQuestions[0];

		expect(formatStudentAnswerText(singleQ, ["opt-2"])).toBe("fork()");
		expect(
			formatCorrectAnswerText(multiQ, {
				selectedOptionIds: ["opt-a", "opt-b"],
			}),
		).toBe("Syscall trap, Timer interrupt");
		expect(formatStudentAnswerText(tfQ, false)).toBe("False");
		expect(formatCorrectAnswerText(tfQ, { booleanAnswer: true })).toBe("True");
		expect(formatStudentAnswerText(blankQ, "kernel mode")).toBe("kernel mode");
		expect(formatCorrectAnswerText(blankQ, ["kernel mode", "kernel"])).toBe(
			"kernel mode, kernel",
		);
		expect(formatStudentAnswerText(singleQ, null)).toBe("No answer");
		expect(formatCorrectAnswerText(blankQ, null)).toBe("Unavailable");
	});
});

describe("course outline organization helpers", () => {
	const blocks: CourseBlock[] = [
		{
			id: "mod-2",
			courseId: "course-os",
			type: "MODULE",
			title: "Module 2",
			parentModuleId: null,
			position: 3,
			content: null,
		},
		{
			id: "child-2-2",
			courseId: "course-os",
			type: "QUIZ",
			title: "Module 2 Quiz",
			parentModuleId: "mod-2",
			position: 2,
			content: null,
		},
		{
			id: "child-2-1",
			courseId: "course-os",
			type: "TEXT",
			title: "Module 2 Text",
			parentModuleId: "mod-2",
			position: 1,
			content: null,
		},
		{
			id: "standalone-quiz",
			courseId: "course-os",
			type: "QUIZ",
			title: "Midterm Quiz",
			parentModuleId: null,
			position: 2,
			content: null,
		},
		{
			id: "mod-1",
			courseId: "course-os",
			type: "MODULE",
			title: "Module 1",
			parentModuleId: null,
			position: 1,
			content: null,
			children: [
				{
					id: "child-1-2",
					courseId: "course-os",
					type: "VIDEO",
					title: "Module 1 Video",
					parentModuleId: "mod-1",
					position: 2,
					content: null,
				},
				{
					id: "child-1-1",
					courseId: "course-os",
					type: "TEXT",
					title: "Module 1 Intro",
					parentModuleId: "mod-1",
					position: 1,
					content: null,
				},
			],
		},
	];

	it("sorts modules, children, and root standalone blocks by position", () => {
		const outline = organizeCourseOutlineBlocks(blocks);

		expect(outline).toHaveLength(3);
		expect(outline[0]).toMatchObject({
			kind: "module",
			block: { id: "mod-1" },
		});
		if (outline[0].kind === "module") {
			expect(outline[0].children.map((c) => c.id)).toEqual([
				"child-1-1",
				"child-1-2",
			]);
		}

		expect(outline[1]).toMatchObject({
			kind: "block",
			block: { id: "standalone-quiz" },
		});

		expect(outline[2]).toMatchObject({
			kind: "module",
			block: { id: "mod-2" },
		});
		if (outline[2].kind === "module") {
			expect(outline[2].children.map((c) => c.id)).toEqual([
				"child-2-1",
				"child-2-2",
			]);
		}
	});

	it("flattens non-MODULE blocks in exact display order", () => {
		const flattened = flattenLearnContentBlocks(blocks);
		expect(flattened.map((b) => b.id)).toEqual([
			"child-1-1",
			"child-1-2",
			"standalone-quiz",
			"child-2-1",
			"child-2-2",
		]);
	});
});
