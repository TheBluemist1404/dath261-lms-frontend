import { afterEach, describe, expect, it, vi } from "vitest";
import { httpClient } from "@/lib/http/client";
import type {
	QuizConfigUpdateInput,
	QuizCreateInput,
	QuizQuestionInput,
	QuizResponse,
} from "../types/quiz.types";
import {
	createQuiz,
	getQuiz,
	releaseQuizResults,
	replaceQuizQuestions,
	updateQuizConfig,
} from "./quiz.api";

vi.mock("@/lib/http/client", () => ({
	httpClient: {
		get: vi.fn(),
		post: vi.fn(),
		patch: vi.fn(),
	},
}));

const quiz: QuizResponse = {
	id: "quiz-1",
	courseId: "course-1",
	title: "Quiz",
	maxAttempts: 2,
	scoringMode: "HIGHEST",
	availableFrom: null,
	deadline: null,
	allowLate: false,
	resultsReleasedAt: null,
	questions: [],
	createdAt: "2026-01-01T00:00:00.000Z",
	updatedAt: "2026-01-01T00:00:00.000Z",
};

afterEach(() => vi.clearAllMocks());

describe("quiz API", () => {
	it("creates a quiz under its course", async () => {
		const payload: QuizCreateInput = {
			title: "Quiz",
			questions: [],
		};
		vi.mocked(httpClient.post).mockResolvedValue({ data: quiz } as never);

		await expect(createQuiz("course-1", payload)).resolves.toEqual(quiz);

		expect(httpClient.post).toHaveBeenCalledWith(
			"/courses/course-1/quizzes",
			payload,
		);
	});

	it("gets a quiz by course and block IDs", async () => {
		vi.mocked(httpClient.get).mockResolvedValue({ data: quiz } as never);

		await expect(getQuiz("course/1", "block 1")).resolves.toEqual(quiz);

		expect(httpClient.get).toHaveBeenCalledWith(
			"/courses/course%2F1/quizzes/block%201",
		);
	});

	it("updates quiz configuration", async () => {
		const config: QuizConfigUpdateInput = { maxAttempts: 3 };
		vi.mocked(httpClient.patch).mockResolvedValue({ data: quiz } as never);

		await expect(
			updateQuizConfig("course-1", "quiz-1", config),
		).resolves.toEqual(quiz);

		expect(httpClient.patch).toHaveBeenCalledWith(
			"/courses/course-1/quizzes/quiz-1/config",
			config,
		);
	});

	it("replaces a quiz's questions", async () => {
		const questions: QuizQuestionInput[] = [
			{ type: "TRUE_FALSE", text: "Is this a quiz?", correctBoolean: true },
		];
		vi.mocked(httpClient.patch).mockResolvedValue({ data: quiz } as never);

		await expect(
			replaceQuizQuestions("course-1", "quiz-1", questions),
		).resolves.toEqual(quiz);

		expect(httpClient.patch).toHaveBeenCalledWith(
			"/courses/course-1/quizzes/quiz-1/questions",
			questions,
		);
	});

	it("releases results without a request body", async () => {
		vi.mocked(httpClient.patch).mockResolvedValue({ data: quiz } as never);

		await expect(releaseQuizResults("course-1", "quiz-1")).resolves.toEqual(
			quiz,
		);

		expect(httpClient.patch).toHaveBeenCalledWith(
			"/courses/course-1/quizzes/quiz-1/release-results",
		);
	});
});
