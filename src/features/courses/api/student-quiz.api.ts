import { httpClient } from "@/lib/http/client";
import { getApiErrorStatus } from "@/lib/http/errors";
import type {
	QuizAttemptResponse,
	StudentQuizResponse,
	SubmitQuizAttemptInput,
} from "../types/student-quiz.types";

type MyQuizAttemptsRawResponse =
	| QuizAttemptResponse[]
	| { data: QuizAttemptResponse[] };

export async function getStudentQuiz(
	courseId: string,
	blockId: string,
	signal?: AbortSignal,
): Promise<StudentQuizResponse> {
	const { data } = await httpClient.get<StudentQuizResponse>(
		`/courses/${encodeURIComponent(courseId)}/quizzes/${encodeURIComponent(blockId)}/student`,
		{ signal },
	);
	return data;
}

export async function submitQuizAttempt(
	courseId: string,
	blockId: string,
	payload: SubmitQuizAttemptInput,
): Promise<QuizAttemptResponse> {
	const { data } = await httpClient.post<QuizAttemptResponse>(
		`/courses/${encodeURIComponent(courseId)}/quizzes/${encodeURIComponent(blockId)}/attempts`,
		payload,
	);
	return data;
}

export async function getMyLatestQuizAttempt(
	courseId: string,
	blockId: string,
	signal?: AbortSignal,
): Promise<QuizAttemptResponse | null> {
	const { data } = await httpClient.get<QuizAttemptResponse | null | "">(
		`/courses/${encodeURIComponent(courseId)}/quizzes/${encodeURIComponent(blockId)}/my-latest-attempt`,
		{ signal },
	);
	if (!data || typeof data !== "object") {
		return null;
	}
	return data;
}

export async function getMyQuizAttempts(
	courseId: string,
	blockId: string,
	signal?: AbortSignal,
): Promise<QuizAttemptResponse[]> {
	try {
		const { data } = await httpClient.get<MyQuizAttemptsRawResponse>(
			`/courses/${encodeURIComponent(courseId)}/quizzes/${encodeURIComponent(blockId)}/my-attempts`,
			{ signal },
		);
		const items = Array.isArray(data)
			? data
			: data && typeof data === "object" && Array.isArray(data.data)
				? data.data
				: [];
		return [...items].sort((a, b) => b.attemptNumber - a.attemptNumber);
	} catch (error) {
		if (getApiErrorStatus(error) === 404) {
			const latest = await getMyLatestQuizAttempt(courseId, blockId, signal);
			return latest ? [latest] : [];
		}
		throw error;
	}
}
