import { HttpResponse, http } from "msw";
import { afterEach, describe, expect, it } from "vitest";
import { getApiErrorStatus } from "@/lib/http/errors";
import { signInForTest } from "@/test/auth";
import { server } from "@/test/mocks/server";
import type {
	QuizAttemptResponse,
	StudentQuizResponse,
} from "../types/student-quiz.types";
import {
	getMyLatestQuizAttempt,
	getMyQuizAttempts,
	getStudentQuiz,
	submitQuizAttempt,
} from "./student-quiz.api";

const sampleQuiz: StudentQuizResponse = {
	id: "block/1",
	courseId: "course/1",
	title: "Quiz One",
	maxAttempts: 3,
	scoringMode: "HIGHEST",
	availableFrom: null,
	deadline: null,
	allowLate: false,
	resultsReleasedAt: null,
	questions: [],
};

const sampleAttempt1: QuizAttemptResponse = {
	id: "att-1",
	courseBlockId: "block-1",
	attemptNumber: 1,
	status: "GRADED",
	score: 60,
	isLate: false,
	submittedAt: "2026-10-10T10:00:00.000Z",
	resultsReleased: false,
	answers: null,
};

const sampleAttempt2: QuizAttemptResponse = {
	...sampleAttempt1,
	id: "att-2",
	attemptNumber: 2,
	score: 90,
};

let cleanupAuth: (() => void) | null = null;

afterEach(() => {
	cleanupAuth?.();
	cleanupAuth = null;
});

describe("student-quiz.api", () => {
	it("fetches student quiz with encoded courseId and blockId and forwards auth header", async () => {
		cleanupAuth = signInForTest("student-1", "STUDENT");
		let observedPathname = "";
		let observedAuth = "";

		server.use(
			http.get(
				"*/api/courses/:courseId/quizzes/:blockId/student",
				({ request }) => {
					observedPathname = new URL(request.url).pathname;
					observedAuth = request.headers.get("Authorization") ?? "";
					return HttpResponse.json(sampleQuiz);
				},
			),
		);

		const result = await getStudentQuiz("course/a b", "block#1");

		expect(result).toEqual(sampleQuiz);
		expect(observedPathname).toBe(
			"/api/courses/course%2Fa%20b/quizzes/block%231/student",
		);
		expect(observedAuth).toMatch(/^Bearer /);
	});

	it("submits quiz attempt payload to attempts endpoint and returns created attempt", async () => {
		cleanupAuth = signInForTest("student-1", "STUDENT");
		let observedPathname = "";
		let receivedBody: unknown = null;

		server.use(
			http.post(
				"*/api/courses/:courseId/quizzes/:blockId/attempts",
				async ({ request }) => {
					observedPathname = new URL(request.url).pathname;
					receivedBody = await request.json();
					return HttpResponse.json(sampleAttempt1, { status: 201 });
				},
			),
		);

		const payload = {
			answers: [{ questionId: "q-1", selectedOptionIds: ["opt-1"] }],
		};
		const result = await submitQuizAttempt("course-os", "block/1", payload);

		expect(result).toEqual(sampleAttempt1);
		expect(observedPathname).toBe(
			"/api/courses/course-os/quizzes/block%2F1/attempts",
		);
		expect(receivedBody).toEqual(payload);
	});

	it("normalizes empty string and null responses from getMyLatestQuizAttempt to null", async () => {
		cleanupAuth = signInForTest("student-1", "STUDENT");

		server.use(
			http.get(
				"*/api/courses/:courseId/quizzes/:blockId/my-latest-attempt",
				() => new HttpResponse("", { status: 200 }),
			),
		);

		expect(await getMyLatestQuizAttempt("course-os", "block-1")).toBeNull();

		server.use(
			http.get(
				"*/api/courses/:courseId/quizzes/:blockId/my-latest-attempt",
				() => HttpResponse.json(sampleAttempt2),
			),
		);

		expect(await getMyLatestQuizAttempt("course-os", "block-1")).toEqual(
			sampleAttempt2,
		);
	});

	it("normalizes wrapped { data } responses and sorts attempts descending by attemptNumber", async () => {
		cleanupAuth = signInForTest("student-1", "STUDENT");

		server.use(
			http.get("*/api/courses/:courseId/quizzes/:blockId/my-attempts", () =>
				HttpResponse.json({ data: [sampleAttempt1, sampleAttempt2] }),
			),
		);

		const attempts = await getMyQuizAttempts("course-os", "block-1");
		expect(attempts.map((a) => a.attemptNumber)).toEqual([2, 1]);
	});

	it("falls back to my-latest-attempt when my-attempts returns 404", async () => {
		cleanupAuth = signInForTest("student-1", "STUDENT");

		server.use(
			http.get("*/api/courses/:courseId/quizzes/:blockId/my-attempts", () =>
				HttpResponse.json({ message: "Not Found" }, { status: 404 }),
			),
			http.get(
				"*/api/courses/:courseId/quizzes/:blockId/my-latest-attempt",
				() => HttpResponse.json(sampleAttempt2),
			),
		);

		expect(await getMyQuizAttempts("course-os", "block-1")).toEqual([
			sampleAttempt2,
		]);

		server.use(
			http.get(
				"*/api/courses/:courseId/quizzes/:blockId/my-latest-attempt",
				() => new HttpResponse("", { status: 200 }),
			),
		);

		expect(await getMyQuizAttempts("course-os", "block-1")).toEqual([]);
	});

	it("propagates 403 and 409 errors without swallowing", async () => {
		cleanupAuth = signInForTest("student-1", "STUDENT");

		server.use(
			http.get("*/api/courses/:courseId/quizzes/:blockId/my-attempts", () =>
				HttpResponse.json({ message: "Forbidden" }, { status: 403 }),
			),
			http.post("*/api/courses/:courseId/quizzes/:blockId/attempts", () =>
				HttpResponse.json(
					{ message: "Maximum number of attempts (1) has been reached." },
					{ status: 409 },
				),
			),
		);

		await expect(
			getMyQuizAttempts("course-os", "block-1").catch((err) => {
				expect(getApiErrorStatus(err)).toBe(403);
				throw err;
			}),
		).rejects.toThrow();

		await expect(
			submitQuizAttempt("course-os", "block-1", { answers: [] }).catch(
				(err) => {
					expect(getApiErrorStatus(err)).toBe(409);
					throw err;
				},
			),
		).rejects.toThrow();
	});
});
