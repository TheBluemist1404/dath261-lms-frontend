import type { CourseBlock } from "../types/course-block.types";
import type {
	AttemptReviewState,
	DraftQuestionAnswer,
	OutlineNode,
	QuizAttemptResponse,
	QuizScoringMode,
	QuizTakeState,
	StudentQuizQuestion,
	StudentQuizResponse,
	SubmitAnswerInput,
	SubmitQuizAttemptInput,
} from "../types/student-quiz.types";

function roundHalfUp2(value: number): number {
	const sign = value < 0 ? -1 : 1;
	return (sign * Math.round(Math.abs(value) * 100 + 1e-9)) / 100;
}

export function resolveQuizTakeState(
	quiz: StudentQuizResponse,
	attemptsUsed: number,
	nowMs = Date.now(),
): QuizTakeState {
	if (quiz.availableFrom !== null) {
		const availableAtMs = Date.parse(quiz.availableFrom);
		if (!Number.isNaN(availableAtMs) && nowMs < availableAtMs) {
			return {
				kind: "not_available_yet",
				availableFrom: quiz.availableFrom,
			};
		}
	}

	let isPastDeadline = false;
	if (quiz.deadline !== null) {
		const deadlineMs = Date.parse(quiz.deadline);
		if (!Number.isNaN(deadlineMs) && nowMs > deadlineMs) {
			isPastDeadline = true;
			if (!quiz.allowLate) {
				return {
					kind: "past_deadline_blocked",
					deadline: quiz.deadline,
				};
			}
		}
	}

	const normalizedAttemptsUsed = Math.max(0, attemptsUsed);
	if (normalizedAttemptsUsed >= quiz.maxAttempts) {
		return {
			kind: "no_attempts_left",
			maxAttempts: quiz.maxAttempts,
			attemptsUsed: normalizedAttemptsUsed,
		};
	}

	return {
		kind: "available",
		isLate: isPastDeadline,
		attemptsUsed: normalizedAttemptsUsed,
		attemptsRemaining: quiz.maxAttempts - normalizedAttemptsUsed,
	};
}

export function resolveAttemptReviewState(
	attempt: QuizAttemptResponse,
): AttemptReviewState {
	if (attempt.resultsReleased && attempt.answers !== null) {
		return {
			kind: "released",
			answers: attempt.answers,
		};
	}

	return { kind: "withheld" };
}

type ScoredAttempt = QuizAttemptResponse & { score: number };

function isScoredAttempt(
	attempt: QuizAttemptResponse,
): attempt is ScoredAttempt {
	return typeof attempt.score === "number" && Number.isFinite(attempt.score);
}

export function computeAggregatedQuizScore(
	attempts: readonly QuizAttemptResponse[],
	scoringMode: QuizScoringMode,
): number | null {
	const scored = attempts.filter(isScoredAttempt);
	if (scored.length === 0) {
		return null;
	}

	switch (scoringMode) {
		case "HIGHEST": {
			let highest = scored[0].score;
			for (const attempt of scored) {
				if (attempt.score > highest) {
					highest = attempt.score;
				}
			}
			return highest;
		}
		case "LATEST": {
			let latest = scored[0];
			for (const attempt of scored) {
				if (attempt.attemptNumber >= latest.attemptNumber) {
					latest = attempt;
				}
			}
			return latest.score;
		}
		case "AVERAGE": {
			let sum = 0;
			for (const attempt of scored) {
				sum += attempt.score;
			}
			return roundHalfUp2(sum / scored.length);
		}
		default: {
			const _exhaustive: never = scoringMode;
			return _exhaustive;
		}
	}
}

export function isQuestionAnswered(
	answer: DraftQuestionAnswer | undefined,
): boolean {
	if (!answer) {
		return false;
	}

	switch (answer.type) {
		case "SINGLE_CHOICE":
			return answer.optionId.trim().length > 0;
		case "MULTIPLE_CHOICE":
			return answer.optionIds.length > 0;
		case "TRUE_FALSE":
			return typeof answer.value === "boolean";
		case "FILL_IN_BLANK":
			return answer.text.trim().length > 0;
		default: {
			const _exhaustive: never = answer;
			return _exhaustive;
		}
	}
}

export function countAnsweredQuestions(
	questions: readonly StudentQuizQuestion[],
	drafts: Readonly<Record<string, DraftQuestionAnswer>>,
): number {
	let count = 0;
	for (const question of questions) {
		const draft = drafts[question.id];
		if (
			draft !== undefined &&
			draft.type === question.type &&
			isQuestionAnswered(draft)
		) {
			count += 1;
		}
	}
	return count;
}

export function buildSubmitAnswersPayload(
	questions: readonly StudentQuizQuestion[],
	drafts: Readonly<Record<string, DraftQuestionAnswer>>,
): SubmitQuizAttemptInput {
	const sortedQuestions = [...questions].sort(
		(a, b) => a.position - b.position,
	);
	const answers: SubmitAnswerInput[] = [];

	for (const question of sortedQuestions) {
		const draft = drafts[question.id];
		if (
			draft === undefined ||
			draft.type !== question.type ||
			!isQuestionAnswered(draft)
		) {
			continue;
		}

		switch (draft.type) {
			case "SINGLE_CHOICE":
				answers.push({
					questionId: question.id,
					selectedOptionIds: [draft.optionId],
				});
				break;
			case "MULTIPLE_CHOICE":
				answers.push({
					questionId: question.id,
					selectedOptionIds: [...draft.optionIds],
				});
				break;
			case "TRUE_FALSE":
				answers.push({
					questionId: question.id,
					booleanAnswer: draft.value,
				});
				break;
			case "FILL_IN_BLANK":
				answers.push({
					questionId: question.id,
					textAnswer: draft.text.trim(),
				});
				break;
			default: {
				const _exhaustive: never = draft;
				return _exhaustive;
			}
		}
	}

	return { answers };
}

function extractOptionIdsFromRaw(value: unknown): string[] {
	if (typeof value === "string") {
		return value.trim().length > 0 ? [value] : [];
	}

	if (Array.isArray(value)) {
		const result: string[] = [];
		for (const item of value) {
			if (typeof item === "string" && item.trim().length > 0) {
				result.push(item);
			} else if (typeof item === "object" && item !== null) {
				if ("text" in item && typeof item.text === "string") {
					result.push(item.text);
				} else if ("id" in item && typeof item.id === "string") {
					result.push(item.id);
				}
			}
		}
		return result;
	}

	if (typeof value === "object" && value !== null) {
		if (
			"selectedOptionIds" in value &&
			Array.isArray(value.selectedOptionIds)
		) {
			return extractOptionIdsFromRaw(value.selectedOptionIds);
		}
		if ("optionIds" in value && Array.isArray(value.optionIds)) {
			return extractOptionIdsFromRaw(value.optionIds);
		}
		if ("optionId" in value && typeof value.optionId === "string") {
			return value.optionId.trim().length > 0 ? [value.optionId] : [];
		}
		if (
			"selectedOptionId" in value &&
			typeof value.selectedOptionId === "string"
		) {
			return value.selectedOptionId.trim().length > 0
				? [value.selectedOptionId]
				: [];
		}
		if ("text" in value && typeof value.text === "string") {
			return value.text.trim().length > 0 ? [value.text] : [];
		}
	}

	return [];
}

function extractBooleanFromRaw(value: unknown): boolean | null {
	if (typeof value === "boolean") {
		return value;
	}
	if (typeof value === "string") {
		const normalized = value.trim().toLowerCase();
		if (normalized === "true") return true;
		if (normalized === "false") return false;
		return null;
	}
	if (typeof value === "object" && value !== null) {
		if ("booleanAnswer" in value && typeof value.booleanAnswer === "boolean") {
			return value.booleanAnswer;
		}
		if (
			"correctBoolean" in value &&
			typeof value.correctBoolean === "boolean"
		) {
			return value.correctBoolean;
		}
		if ("value" in value && typeof value.value === "boolean") {
			return value.value;
		}
	}
	return null;
}

function extractTextValuesFromRaw(value: unknown): string[] {
	if (typeof value === "string") {
		return value.trim().length > 0 ? [value] : [];
	}
	if (Array.isArray(value)) {
		return value.filter(
			(item): item is string =>
				typeof item === "string" && item.trim().length > 0,
		);
	}
	if (typeof value === "object" && value !== null) {
		if ("textAnswer" in value && typeof value.textAnswer === "string") {
			return value.textAnswer.trim().length > 0 ? [value.textAnswer] : [];
		}
		if ("acceptedAnswers" in value && Array.isArray(value.acceptedAnswers)) {
			return extractTextValuesFromRaw(value.acceptedAnswers);
		}
		if ("text" in value && typeof value.text === "string") {
			return value.text.trim().length > 0 ? [value.text] : [];
		}
	}
	return [];
}

function formatAnswerValue(
	question: StudentQuizQuestion,
	rawValue: unknown,
	emptyLabel: string,
): string {
	switch (question.type) {
		case "SINGLE_CHOICE":
		case "MULTIPLE_CHOICE": {
			const optionIds = extractOptionIdsFromRaw(rawValue);
			if (optionIds.length === 0) {
				return emptyLabel;
			}
			const labels = optionIds.map((optionId) => {
				const matched = question.options?.find(
					(option) => option.id === optionId,
				);
				return matched ? matched.text : optionId;
			});
			return labels.join(", ");
		}
		case "TRUE_FALSE": {
			const parsed = extractBooleanFromRaw(rawValue);
			if (parsed === null) {
				return emptyLabel;
			}
			return parsed ? "True" : "False";
		}
		case "FILL_IN_BLANK": {
			const texts = extractTextValuesFromRaw(rawValue);
			if (texts.length === 0) {
				return emptyLabel;
			}
			return texts.join(", ");
		}
		default: {
			const _exhaustive: never = question.type;
			return _exhaustive;
		}
	}
}

export function formatStudentAnswerText(
	question: StudentQuizQuestion,
	studentAnswer: unknown,
): string {
	return formatAnswerValue(question, studentAnswer, "No answer");
}

export function formatCorrectAnswerText(
	question: StudentQuizQuestion,
	correctAnswer: unknown,
): string {
	return formatAnswerValue(question, correctAnswer, "Unavailable");
}

export function organizeCourseOutlineBlocks(
	blocks: readonly CourseBlock[],
): OutlineNode[] {
	const rootBlocks = blocks
		.filter((block) => block.parentModuleId === null)
		.sort((a, b) => a.position - b.position);

	return rootBlocks.map((block) => {
		if (block.type === "MODULE") {
			const children =
				block.children && block.children.length > 0
					? [...block.children].sort((a, b) => a.position - b.position)
					: blocks
							.filter((candidate) => candidate.parentModuleId === block.id)
							.sort((a, b) => a.position - b.position);

			return {
				kind: "module",
				block,
				children,
			};
		}

		return {
			kind: "block",
			block,
		};
	});
}

export function flattenLearnContentBlocks(
	blocks: readonly CourseBlock[],
): CourseBlock[] {
	const outline = organizeCourseOutlineBlocks(blocks);
	const flattened: CourseBlock[] = [];

	for (const node of outline) {
		switch (node.kind) {
			case "module":
				for (const child of node.children) {
					if (child.type !== "MODULE") {
						flattened.push(child);
					}
				}
				break;
			case "block":
				flattened.push(node.block);
				break;
			default: {
				const _exhaustive: never = node;
				return _exhaustive;
			}
		}
	}

	return flattened;
}
