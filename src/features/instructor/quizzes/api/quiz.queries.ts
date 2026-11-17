import { queryOptions } from "@tanstack/react-query";
import { getQuiz } from "./quiz.api";

export const quizQueryOptions = (courseId: string, blockId: string) =>
	queryOptions({
		queryKey: ["quiz", courseId, blockId],
		queryFn: () => getQuiz(courseId, blockId),
		enabled: Boolean(courseId) && Boolean(blockId),
	});

export function useQuizQuery(courseId: string, blockId: string) {
	return quizQueryOptions(courseId, blockId);
}
