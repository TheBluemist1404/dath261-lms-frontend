import {
	queryOptions,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import type { SubmitQuizAttemptInput } from "../types/student-quiz.types";
import { enrollmentKeys, progressKeys } from "./enrollment.queries";
import {
	getMyLatestQuizAttempt,
	getMyQuizAttempts,
	getStudentQuiz,
	submitQuizAttempt,
} from "./student-quiz.api";

export const studentQuizKeys = {
	all: ["student-quizzes"] as const,
	quiz: (courseId: string, blockId: string) =>
		[...studentQuizKeys.all, "quiz", courseId, blockId] as const,
	latestAttempt: (courseId: string, blockId: string) =>
		[...studentQuizKeys.all, "latest-attempt", courseId, blockId] as const,
	attempts: (courseId: string, blockId: string) =>
		[...studentQuizKeys.all, "attempts", courseId, blockId] as const,
};

export function studentQuizOptions(courseId: string, blockId: string) {
	return queryOptions({
		queryKey: studentQuizKeys.quiz(courseId, blockId),
		queryFn: ({ signal }) => getStudentQuiz(courseId, blockId, signal),
		enabled: Boolean(courseId && blockId),
		retry: false,
	});
}

export function useStudentQuiz(
	courseId: string,
	blockId: string,
	options?: { enabled?: boolean },
) {
	return useQuery({
		...studentQuizOptions(courseId, blockId),
		enabled: Boolean(courseId && blockId) && (options?.enabled ?? true),
	});
}

export function myLatestQuizAttemptOptions(courseId: string, blockId: string) {
	return queryOptions({
		queryKey: studentQuizKeys.latestAttempt(courseId, blockId),
		queryFn: ({ signal }) => getMyLatestQuizAttempt(courseId, blockId, signal),
		enabled: Boolean(courseId && blockId),
		retry: false,
	});
}

export function useMyLatestQuizAttempt(
	courseId: string,
	blockId: string,
	options?: { enabled?: boolean },
) {
	return useQuery({
		...myLatestQuizAttemptOptions(courseId, blockId),
		enabled: Boolean(courseId && blockId) && (options?.enabled ?? true),
	});
}

export function myQuizAttemptsOptions(courseId: string, blockId: string) {
	return queryOptions({
		queryKey: studentQuizKeys.attempts(courseId, blockId),
		queryFn: ({ signal }) => getMyQuizAttempts(courseId, blockId, signal),
		enabled: Boolean(courseId && blockId),
		retry: false,
	});
}

export function useMyQuizAttempts(
	courseId: string,
	blockId: string,
	options?: { enabled?: boolean },
) {
	return useQuery({
		...myQuizAttemptsOptions(courseId, blockId),
		enabled: Boolean(courseId && blockId) && (options?.enabled ?? true),
	});
}

export function useSubmitQuizAttempt(courseId: string, blockId: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (payload: SubmitQuizAttemptInput) =>
			submitQuizAttempt(courseId, blockId, payload),
		onSuccess: async () => {
			await Promise.all([
				queryClient.invalidateQueries({
					queryKey: studentQuizKeys.attempts(courseId, blockId),
				}),
				queryClient.invalidateQueries({
					queryKey: studentQuizKeys.latestAttempt(courseId, blockId),
				}),
				queryClient.invalidateQueries({
					queryKey: progressKeys.course(courseId),
				}),
				queryClient.invalidateQueries({
					queryKey: progressKeys.resume(courseId),
				}),
				queryClient.invalidateQueries({
					queryKey: enrollmentKeys.myLists(),
				}),
			]);
		},
	});
}
