import axios from "axios";
import { beforeEach, describe, expect, it } from "vitest";
import type { StudentProgressResponseDto } from "@/features/courses/types/enrollment.types";
import type {
	QuizAttemptResponse,
	StudentQuizResponse,
} from "@/features/courses/types/student-quiz.types";
import { resetEnrollmentMockState } from "./enrollments.handlers";
import { releaseMockQuizResults } from "./quizzes.handlers";

const testClient = axios.create({
	baseURL: "/api",
	validateStatus: () => true,
});

const authHeaders = {
	Authorization: "Bearer valid-mock-token",
};

describe("MSW Student Quiz Handlers", () => {
	beforeEach(() => {
		resetEnrollmentMockState();
	});

	it("enforces 401 auth guard on all student quiz endpoints", async () => {
		const studentRes = await testClient.get(
			"/courses/course-intro-cs/quizzes/block-1-3/student",
		);
		expect(studentRes.status).toBe(401);

		const latestRes = await testClient.get(
			"/courses/course-intro-cs/quizzes/block-1-3/my-latest-attempt",
			{ headers: { Authorization: "Basic invalid" } },
		);
		expect(latestRes.status).toBe(401);

		const attemptsRes = await testClient.get(
			"/courses/course-intro-cs/quizzes/block-1-3/my-attempts",
		);
		expect(attemptsRes.status).toBe(401);

		const submitRes = await testClient.post(
			"/courses/course-intro-cs/quizzes/block-1-3/attempts",
			{ answers: [] },
		);
		expect(submitRes.status).toBe(401);
	});

	it("enforces 403 enrollment access for un-enrolled courses", async () => {
		const res = await testClient.get(
			"/courses/course-none/quizzes/block-1-3/student",
			{ headers: authHeaders },
		);
		expect(res.status).toBe(403);
	});

	it("strips answer keys from student quiz endpoint", async () => {
		const res = await testClient.get<StudentQuizResponse>(
			"/courses/course-intro-cs/quizzes/block-1-3/student",
			{ headers: authHeaders },
		);

		expect(res.status).toBe(200);
		expect(res.data.title).toBe("System Call Knowledge Check");
		expect(res.data.questions).toHaveLength(4);

		for (const question of res.data.questions) {
			expect("correctBoolean" in question).toBe(false);
			expect("acceptedAnswers" in question).toBe(false);
			if (question.options) {
				for (const option of question.options) {
					expect("isCorrect" in option).toBe(false);
				}
			}
		}
	});

	it("hides attempt answers while resultsReleased is false and reveals correctAnswer once released", async () => {
		const submitRes = await testClient.post<QuizAttemptResponse>(
			"/courses/course-intro-cs/quizzes/block-1-3/attempts",
			{
				answers: [
					{ questionId: "q-sys-1", selectedOptionIds: ["opt-sys-1b"] },
					{
						questionId: "q-sys-2",
						selectedOptionIds: ["opt-sys-2a", "opt-sys-2b", "opt-sys-2d"],
					},
					{ questionId: "q-sys-3", booleanAnswer: false },
					{ questionId: "q-sys-4", textAnswer: "  Kernel Mode  " },
				],
			},
			{ headers: authHeaders },
		);

		expect(submitRes.status).toBe(201);
		expect(submitRes.data.score).toBe(100);
		expect(submitRes.data.resultsReleased).toBe(false);
		expect(submitRes.data.answers).toBeNull();

		const withheldList = await testClient.get<QuizAttemptResponse[]>(
			"/courses/course-intro-cs/quizzes/block-1-3/my-attempts",
			{ headers: authHeaders },
		);
		expect(withheldList.status).toBe(200);
		expect(withheldList.data).toHaveLength(1);
		expect(withheldList.data[0].resultsReleased).toBe(false);
		expect(withheldList.data[0].answers).toBeNull();

		releaseMockQuizResults("block-1-3");

		const releasedList = await testClient.get<QuizAttemptResponse[]>(
			"/courses/course-intro-cs/quizzes/block-1-3/my-attempts",
			{ headers: authHeaders },
		);
		expect(releasedList.status).toBe(200);
		expect(releasedList.data[0].resultsReleased).toBe(true);
		expect(releasedList.data[0].answers).toHaveLength(4);
		expect(releasedList.data[0].answers?.[0]).toEqual({
			questionId: "q-sys-1",
			points: 25,
			earnedPoints: 25,
			isCorrect: true,
			correctAnswer: ["opt-sys-1b"],
			studentAnswer: ["opt-sys-1b"],
		});
	});

	it("grades all four question types with all-or-nothing multiple choice, trimmed fill-in-blank, and HALF_UP rounding", async () => {
		const partialRes = await testClient.post<QuizAttemptResponse>(
			"/courses/course-intro-cs/quizzes/quiz-released/attempts",
			{
				answers: [
					{ questionId: "q-rel-1", selectedOptionIds: ["opt-rel-1b"] },
					{ questionId: "q-rel-2", selectedOptionIds: ["opt-rel-2a"] },
					{ questionId: "q-rel-3", booleanAnswer: false },
					{ questionId: "q-rel-4", textAnswer: "  SEMAPHORE " },
				],
			},
			{ headers: authHeaders },
		);

		expect(partialRes.status).toBe(201);
		expect(partialRes.data.resultsReleased).toBe(true);
		expect(partialRes.data.score).toBe(66.67);
		expect(partialRes.data.answers).toEqual([
			{
				questionId: "q-rel-1",
				points: 10,
				earnedPoints: 10,
				isCorrect: true,
				correctAnswer: ["opt-rel-1b"],
				studentAnswer: ["opt-rel-1b"],
			},
			{
				questionId: "q-rel-2",
				points: 20,
				earnedPoints: 0,
				isCorrect: false,
				correctAnswer: ["opt-rel-2a", "opt-rel-2b"],
				studentAnswer: ["opt-rel-2a"],
			},
			{
				questionId: "q-rel-3",
				points: 10,
				earnedPoints: 10,
				isCorrect: true,
				correctAnswer: false,
				studentAnswer: false,
			},
			{
				questionId: "q-rel-4",
				points: 20,
				earnedPoints: 20,
				isCorrect: true,
				correctAnswer: ["semaphore", "counting semaphore"],
				studentAnswer: "  SEMAPHORE ",
			},
		]);
	});

	it("returns 409 when maximum attempts are exhausted and 403 when quiz is unavailable or closed", async () => {
		const exhaustedList = await testClient.get<QuizAttemptResponse[]>(
			"/courses/course-intro-cs/quizzes/quiz-exhausted/my-attempts",
			{ headers: authHeaders },
		);
		expect(exhaustedList.status).toBe(200);
		expect(exhaustedList.data[0].score).toBe(75);

		const exhaustedSubmit = await testClient.post(
			"/courses/course-intro-cs/quizzes/quiz-exhausted/attempts",
			{ answers: [] },
			{ headers: authHeaders },
		);
		expect(exhaustedSubmit.status).toBe(409);
		expect(exhaustedSubmit.data.message).toBe(
			"Maximum number of attempts (1) has been reached.",
		);

		const notAvailableGet = await testClient.get(
			"/courses/course-intro-cs/quizzes/quiz-not-available/student",
			{ headers: authHeaders },
		);
		expect(notAvailableGet.status).toBe(403);
		expect(notAvailableGet.data.message).toBe("Quiz is not available yet.");

		const lateBlockedSubmit = await testClient.post(
			"/courses/course-intro-cs/quizzes/quiz-late-blocked/attempts",
			{ answers: [] },
			{ headers: authHeaders },
		);
		expect(lateBlockedSubmit.status).toBe(403);

		const lateAllowedSubmit = await testClient.post<QuizAttemptResponse>(
			"/courses/course-intro-cs/quizzes/quiz-late-allowed/attempts",
			{
				answers: [{ questionId: "q-late-ok-1", booleanAnswer: true }],
			},
			{ headers: authHeaders },
		);
		expect(lateAllowedSubmit.status).toBe(201);
		expect(lateAllowedSubmit.data.isLate).toBe(true);
		expect(lateAllowedSubmit.data.score).toBe(50);
	});

	it("increments course progress counters once per submitted quiz block", async () => {
		const beforeRes = await testClient.get<StudentProgressResponseDto>(
			"/courses/course-intro-cs/progress",
			{ headers: authHeaders },
		);
		expect(beforeRes.status).toBe(200);
		expect(beforeRes.data.progress).toEqual({
			totalItems: 10,
			completedItems: 6,
			learningProgressPercentage: 60,
			totalQuizzes: 3,
			completedQuizzes: 2,
			quizCompletionPercentage: 66,
		});

		const firstSubmit = await testClient.post(
			"/courses/course-intro-cs/quizzes/block-1-3/attempts",
			{ answers: [] },
			{ headers: authHeaders },
		);
		expect(firstSubmit.status).toBe(201);

		const afterFirst = await testClient.get<StudentProgressResponseDto>(
			"/courses/course-intro-cs/progress",
			{ headers: authHeaders },
		);
		expect(afterFirst.status).toBe(200);
		expect(afterFirst.data.progress).toEqual({
			totalItems: 10,
			completedItems: 7,
			learningProgressPercentage: 70,
			totalQuizzes: 3,
			completedQuizzes: 3,
			quizCompletionPercentage: 100,
		});

		const secondSubmit = await testClient.post(
			"/courses/course-intro-cs/quizzes/block-1-3/attempts",
			{ answers: [] },
			{ headers: authHeaders },
		);
		expect(secondSubmit.status).toBe(201);

		const afterSecond = await testClient.get<StudentProgressResponseDto>(
			"/courses/course-intro-cs/progress",
			{ headers: authHeaders },
		);
		expect(afterSecond.data.progress).toEqual(afterFirst.data.progress);
	});
});
