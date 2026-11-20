import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import type React from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetEnrollmentMockState } from "@/mocks/enrollments.handlers";
import { signInForTest } from "@/test/auth";
import { server } from "@/test/mocks/server";
import {
	enrollmentKeys,
	progressKeys,
	useStudentProgress,
} from "./enrollment.queries";
import {
	studentQuizKeys,
	useMyLatestQuizAttempt,
	useMyQuizAttempts,
	useStudentQuiz,
	useSubmitQuizAttempt,
} from "./student-quiz.queries";

let cleanupAuth: (() => void) | null = null;

function createWrapper(queryClient: QueryClient) {
	return ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
}

describe("student-quiz.queries", () => {
	beforeEach(() => {
		resetEnrollmentMockState();
		cleanupAuth = signInForTest("student-1", "STUDENT");
	});

	afterEach(() => {
		cleanupAuth?.();
		cleanupAuth = null;
	});

	it("does not retry failed quiz queries so 403 and 404 surface immediately", async () => {
		let requestCount = 0;
		server.use(
			http.get("*/api/courses/:courseId/quizzes/:blockId/student", () => {
				requestCount += 1;
				return HttpResponse.json(
					{ message: "Quiz is not available yet." },
					{ status: 403 },
				);
			}),
		);

		const queryClient = new QueryClient();
		const { result } = renderHook(
			() => useStudentQuiz("course-intro-cs", "quiz-not-available"),
			{ wrapper: createWrapper(queryClient) },
		);

		await waitFor(() => expect(result.current.isError).toBe(true));
		expect(requestCount).toBe(1);
	});

	it("loads quiz, attempts, and invalidates quiz, progress, resume, and my-courses caches after submit", async () => {
		const queryClient = new QueryClient({
			defaultOptions: { queries: { retry: false } },
		});
		const wrapper = createWrapper(queryClient);

		queryClient.setQueryData(progressKeys.resume("course-intro-cs"), {
			hasResumePosition: false,
			lastVisitedAt: null,
			block: null,
			resumeData: null,
		});
		queryClient.setQueryData(enrollmentKeys.myList({}), {
			data: [],
			meta: {
				total: 0,
				page: 1,
				limit: 10,
				totalPages: 0,
				hasNextPage: false,
				hasPreviousPage: false,
			},
		});

		const quizHook = renderHook(
			() => useStudentQuiz("course-intro-cs", "block-1-3"),
			{ wrapper },
		);
		const latestHook = renderHook(
			() => useMyLatestQuizAttempt("course-intro-cs", "block-1-3"),
			{ wrapper },
		);
		const attemptsHook = renderHook(
			() => useMyQuizAttempts("course-intro-cs", "block-1-3"),
			{ wrapper },
		);
		const progressHook = renderHook(
			() => useStudentProgress("course-intro-cs"),
			{ wrapper },
		);

		await waitFor(() => {
			expect(quizHook.result.current.isSuccess).toBe(true);
			expect(latestHook.result.current.isSuccess).toBe(true);
			expect(attemptsHook.result.current.isSuccess).toBe(true);
			expect(progressHook.result.current.isSuccess).toBe(true);
		});

		expect(latestHook.result.current.data).toBeNull();
		expect(attemptsHook.result.current.data).toEqual([]);
		expect(progressHook.result.current.data?.progress.completedQuizzes).toBe(2);

		const submitHook = renderHook(
			() => useSubmitQuizAttempt("course-intro-cs", "block-1-3"),
			{ wrapper },
		);

		await act(async () => {
			await submitHook.result.current.mutateAsync({
				answers: [{ questionId: "q-sys-1", selectedOptionIds: ["opt-sys-1b"] }],
			});
		});

		await waitFor(() => {
			expect(attemptsHook.result.current.data).toHaveLength(1);
			expect(latestHook.result.current.data?.attemptNumber).toBe(1);
			expect(progressHook.result.current.data?.progress.completedQuizzes).toBe(
				3,
			);
		});

		expect(
			queryClient.getQueryState(progressKeys.resume("course-intro-cs"))
				?.isInvalidated,
		).toBe(true);
		expect(
			queryClient.getQueryState(enrollmentKeys.myList({}))?.isInvalidated,
		).toBe(true);
		expect(
			queryClient.getQueryState(
				studentQuizKeys.attempts("course-intro-cs", "block-1-3"),
			)?.dataUpdatedAt,
		).toBeGreaterThan(0);
	});
});
