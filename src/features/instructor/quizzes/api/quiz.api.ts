import { httpClient } from "@/lib/http/client";
import type {
	QuizConfigUpdateInput,
	QuizCreateInput,
	QuizQuestionInput,
	QuizResponse,
} from "../types/quiz.types";

export async function createQuiz(
	courseId: string,
	payload: QuizCreateInput,
): Promise<QuizResponse> {
	const { data } = await httpClient.post<QuizResponse>(
		`/courses/${encodeURIComponent(courseId)}/quizzes`,
		payload,
	);
	return data;
}

export async function getQuiz(
	courseId: string,
	blockId: string,
): Promise<QuizResponse> {
	const { data } = await httpClient.get<QuizResponse>(
		`/courses/${encodeURIComponent(courseId)}/quizzes/${encodeURIComponent(blockId)}`,
	);
	return data;
}

export async function updateQuizConfig(
	courseId: string,
	blockId: string,
	config: QuizConfigUpdateInput,
): Promise<QuizResponse> {
	const { data } = await httpClient.patch<QuizResponse>(
		`/courses/${encodeURIComponent(courseId)}/quizzes/${encodeURIComponent(blockId)}/config`,
		config,
	);
	return data;
}

export async function replaceQuizQuestions(
	courseId: string,
	blockId: string,
	questions: QuizQuestionInput[],
): Promise<QuizResponse> {
	const { data } = await httpClient.patch<QuizResponse>(
		`/courses/${encodeURIComponent(courseId)}/quizzes/${encodeURIComponent(blockId)}/questions`,
		questions,
	);
	return data;
}

export async function releaseQuizResults(
	courseId: string,
	blockId: string,
): Promise<QuizResponse> {
	const { data } = await httpClient.patch<QuizResponse>(
		`/courses/${encodeURIComponent(courseId)}/quizzes/${encodeURIComponent(blockId)}/release-results`,
	);
	return data;
}
