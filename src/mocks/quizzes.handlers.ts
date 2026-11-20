import { HttpResponse, http } from "msw";
import type {
	StudentAttemptAnswerResult,
	SubmitAnswerInput,
	SubmitQuizAttemptInput,
} from "@/features/courses/types/student-quiz.types";
import { requireMockAuth } from "@/test/mocks/mock-auth-guard";
import { hasMockCourseAccess } from "./enrollments.handlers";
import {
	appendMockQuizAttempt,
	getMockCompletedQuizBlockIds,
	getMockQuizAttempts,
	getMockQuizDefinition,
	type MockQuizDefinition,
	type MockQuizQuestion,
	releaseMockQuizResults,
	resetQuizMockState,
	type StoredQuizAttempt,
	toPublicAttemptResponse,
	toStudentQuizResponse,
} from "./quizzes.fixtures";

export {
	getMockCompletedQuizBlockIds,
	releaseMockQuizResults,
	resetQuizMockState,
};

function roundHalfUp2(value: number): number {
	const sign = value < 0 ? -1 : 1;
	return (sign * Math.round(Math.abs(value) * 100 + 1e-9)) / 100;
}

function isStringArray(value: unknown): value is string[] {
	return (
		Array.isArray(value) && value.every((item) => typeof item === "string")
	);
}

function parseSubmitAnswer(raw: unknown): SubmitAnswerInput | null {
	if (typeof raw !== "object" || raw === null) {
		return null;
	}

	const questionId = "questionId" in raw ? raw.questionId : undefined;
	if (typeof questionId !== "string" || questionId.trim().length === 0) {
		return null;
	}

	const selectedOptionIds =
		"selectedOptionIds" in raw && isStringArray(raw.selectedOptionIds)
			? raw.selectedOptionIds
			: undefined;
	const textAnswer =
		"textAnswer" in raw && typeof raw.textAnswer === "string"
			? raw.textAnswer
			: undefined;
	const booleanAnswer =
		"booleanAnswer" in raw && typeof raw.booleanAnswer === "boolean"
			? raw.booleanAnswer
			: undefined;

	return {
		questionId,
		selectedOptionIds,
		textAnswer,
		booleanAnswer,
	};
}

function parseSubmitQuizAttemptBody(
	raw: unknown,
): SubmitQuizAttemptInput | null {
	if (typeof raw !== "object" || raw === null) {
		return null;
	}
	if (!("answers" in raw) || !Array.isArray(raw.answers)) {
		return null;
	}

	const answers: SubmitAnswerInput[] = [];
	for (const item of raw.answers) {
		const parsed = parseSubmitAnswer(item);
		if (!parsed) {
			return null;
		}
		answers.push(parsed);
	}

	return { answers };
}

function gradeQuestion(
	question: MockQuizQuestion,
	input: SubmitAnswerInput | undefined,
): StudentAttemptAnswerResult {
	switch (question.type) {
		case "SINGLE_CHOICE": {
			const correctIds = question.options
				.filter((option) => option.isCorrect)
				.map((option) => option.id);
			const selectedIds = input?.selectedOptionIds ?? [];
			const uniqueSelected = [...new Set(selectedIds)];
			const isCorrect =
				uniqueSelected.length === 1 && correctIds.includes(uniqueSelected[0]);

			return {
				questionId: question.id,
				points: question.points,
				earnedPoints: isCorrect ? question.points : 0,
				isCorrect,
				correctAnswer: correctIds,
				studentAnswer: selectedIds.length > 0 ? selectedIds : null,
			};
		}
		case "MULTIPLE_CHOICE": {
			const correctIds = question.options
				.filter((option) => option.isCorrect)
				.map((option) => option.id);
			const selectedIds = input?.selectedOptionIds ?? [];
			const correctSet = new Set(correctIds);
			const selectedSet = new Set(selectedIds);
			const isCorrect =
				selectedSet.size === correctSet.size &&
				[...correctSet].every((id) => selectedSet.has(id));

			return {
				questionId: question.id,
				points: question.points,
				earnedPoints: isCorrect ? question.points : 0,
				isCorrect,
				correctAnswer: correctIds,
				studentAnswer: selectedIds.length > 0 ? selectedIds : null,
			};
		}
		case "TRUE_FALSE": {
			const hasBoolean = typeof input?.booleanAnswer === "boolean";
			const isCorrect =
				hasBoolean && input.booleanAnswer === question.correctBoolean;

			return {
				questionId: question.id,
				points: question.points,
				earnedPoints: isCorrect ? question.points : 0,
				isCorrect,
				correctAnswer: question.correctBoolean,
				studentAnswer: hasBoolean ? input.booleanAnswer : null,
			};
		}
		case "FILL_IN_BLANK": {
			const rawText = input?.textAnswer;
			const normalized =
				typeof rawText === "string" ? rawText.trim().toLowerCase() : "";
			const isCorrect =
				normalized.length > 0 &&
				question.acceptedAnswers.some(
					(accepted) => accepted.trim().toLowerCase() === normalized,
				);

			return {
				questionId: question.id,
				points: question.points,
				earnedPoints: isCorrect ? question.points : 0,
				isCorrect,
				correctAnswer: [...question.acceptedAnswers],
				studentAnswer:
					typeof rawText === "string" && rawText.trim().length > 0
						? rawText
						: null,
			};
		}
		default: {
			const _exhaustive: never = question;
			return _exhaustive;
		}
	}
}

function gradeSubmission(
	quiz: MockQuizDefinition,
	payload: SubmitQuizAttemptInput,
	attemptNumber: number,
	isLate: boolean,
): StoredQuizAttempt {
	const answersByQuestionId = new Map<string, SubmitAnswerInput>();
	for (const answer of payload.answers) {
		answersByQuestionId.set(answer.questionId, answer);
	}

	const sortedQuestions = [...quiz.questions].sort(
		(a, b) => a.position - b.position,
	);
	const gradedAnswers = sortedQuestions.map((question) =>
		gradeQuestion(question, answersByQuestionId.get(question.id)),
	);

	const totalPoints = gradedAnswers.reduce(
		(sum, answer) => sum + answer.points,
		0,
	);
	const earnedPoints = gradedAnswers.reduce(
		(sum, answer) => sum + answer.earnedPoints,
		0,
	);
	const score =
		totalPoints > 0 ? roundHalfUp2((earnedPoints / totalPoints) * 100) : 0;

	return {
		id: `attempt-${quiz.id}-${attemptNumber}`,
		courseBlockId: quiz.id,
		attemptNumber,
		status: "GRADED",
		score,
		isLate,
		submittedAt: new Date().toISOString(),
		answers: gradedAnswers,
	};
}

function resolveAuthorizedQuiz(
	request: Request,
	courseId: string,
	blockId: string,
):
	| { ok: true; quiz: MockQuizDefinition }
	| { ok: false; response: ReturnType<typeof HttpResponse.json> } {
	const authError = requireMockAuth(request);
	if (authError) {
		return { ok: false, response: authError };
	}

	if (!hasMockCourseAccess(courseId)) {
		return {
			ok: false,
			response: HttpResponse.json(
				{ message: "You must be enrolled in this course to access this quiz." },
				{ status: 403 },
			),
		};
	}

	const quiz = getMockQuizDefinition(blockId);
	if (!quiz) {
		return {
			ok: false,
			response: HttpResponse.json(
				{ message: "Quiz not found." },
				{ status: 404 },
			),
		};
	}

	return { ok: true, quiz };
}

export const quizzesHandlers = [
	http.get(
		"*/api/courses/:courseId/quizzes/:blockId/student",
		({ request, params }) => {
			const courseId = String(params.courseId);
			const blockId = String(params.blockId);
			const resolved = resolveAuthorizedQuiz(request, courseId, blockId);
			if (!resolved.ok) {
				return resolved.response;
			}

			const { quiz } = resolved;
			if (
				quiz.availableFrom !== null &&
				Date.now() < Date.parse(quiz.availableFrom)
			) {
				return HttpResponse.json(
					{ message: "Quiz is not available yet." },
					{ status: 403 },
				);
			}

			return HttpResponse.json(toStudentQuizResponse(quiz, courseId));
		},
	),

	http.get(
		"*/api/courses/:courseId/quizzes/:blockId/my-latest-attempt",
		({ request, params }) => {
			const courseId = String(params.courseId);
			const blockId = String(params.blockId);
			const resolved = resolveAuthorizedQuiz(request, courseId, blockId);
			if (!resolved.ok) {
				return resolved.response;
			}

			const { quiz } = resolved;
			const attempts = getMockQuizAttempts(blockId);
			if (attempts.length === 0) {
				return HttpResponse.json(null);
			}

			let latest = attempts[0];
			for (const attempt of attempts) {
				if (attempt.attemptNumber > latest.attemptNumber) {
					latest = attempt;
				}
			}

			return HttpResponse.json(toPublicAttemptResponse(latest, quiz));
		},
	),

	http.get(
		"*/api/courses/:courseId/quizzes/:blockId/my-attempts",
		({ request, params }) => {
			const courseId = String(params.courseId);
			const blockId = String(params.blockId);
			const resolved = resolveAuthorizedQuiz(request, courseId, blockId);
			if (!resolved.ok) {
				return resolved.response;
			}

			const { quiz } = resolved;
			const attempts = [...getMockQuizAttempts(blockId)]
				.sort((a, b) => b.attemptNumber - a.attemptNumber)
				.map((attempt) => toPublicAttemptResponse(attempt, quiz));

			return HttpResponse.json(attempts);
		},
	),

	http.post(
		"*/api/courses/:courseId/quizzes/:blockId/attempts",
		async ({ request, params }) => {
			const courseId = String(params.courseId);
			const blockId = String(params.blockId);
			const resolved = resolveAuthorizedQuiz(request, courseId, blockId);
			if (!resolved.ok) {
				return resolved.response;
			}

			const { quiz } = resolved;
			const nowMs = Date.now();

			if (
				quiz.availableFrom !== null &&
				nowMs < Date.parse(quiz.availableFrom)
			) {
				return HttpResponse.json(
					{ message: "Quiz is not available yet." },
					{ status: 403 },
				);
			}

			const isLate =
				quiz.deadline !== null && nowMs > Date.parse(quiz.deadline);
			if (isLate && !quiz.allowLate) {
				return HttpResponse.json(
					{
						message:
							"Quiz deadline has passed and late submissions are not allowed.",
					},
					{ status: 403 },
				);
			}

			const existingAttempts = getMockQuizAttempts(blockId);
			if (existingAttempts.length >= quiz.maxAttempts) {
				return HttpResponse.json(
					{
						message: `Maximum number of attempts (${quiz.maxAttempts}) has been reached.`,
					},
					{ status: 409 },
				);
			}

			const rawBody: unknown = await request.json().catch(() => null);
			const payload = parseSubmitQuizAttemptBody(rawBody);
			if (!payload) {
				return HttpResponse.json(
					{ message: "Invalid quiz submission payload." },
					{ status: 400 },
				);
			}

			const storedAttempt = gradeSubmission(
				quiz,
				payload,
				existingAttempts.length + 1,
				isLate,
			);
			appendMockQuizAttempt(courseId, blockId, storedAttempt);

			return HttpResponse.json(toPublicAttemptResponse(storedAttempt, quiz), {
				status: 201,
			});
		},
	),
];
