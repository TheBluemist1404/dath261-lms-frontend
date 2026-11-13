import type {
	QuizConfigUpdateInput,
	QuizQuestionInput,
} from "../types/quiz.types";

export interface QuizConfigValidationErrors {
	title?: string;
	maxAttempts?: string;
	availableFrom?: string;
	deadline?: string;
}

export function validateQuizConfig(
	config: QuizConfigUpdateInput & { title?: string },
): QuizConfigValidationErrors {
	const errors: QuizConfigValidationErrors = {};

	if (config.title !== undefined && !config.title.trim()) {
		errors.title = "Quiz title is required.";
	}

	if (
		config.maxAttempts !== undefined &&
		(!Number.isInteger(config.maxAttempts) || config.maxAttempts < 1)
	) {
		errors.maxAttempts = "Maximum attempts must be at least 1.";
	}

	if (config.availableFrom && config.deadline) {
		const available = new Date(config.availableFrom).getTime();
		const deadline = new Date(config.deadline).getTime();

		if (
			Number.isFinite(available) &&
			Number.isFinite(deadline) &&
			available >= deadline
		) {
			errors.deadline = "Available-from time must be before the deadline.";
		}
	}

	return errors;
}

export function validateQuestion(question: QuizQuestionInput): string[] {
	const errors: string[] = [];

	if (!question.text.trim()) {
		errors.push("Question text is required.");
	}

	if (
		question.points !== undefined &&
		(!Number.isFinite(question.points) || question.points < 0.01)
	) {
		errors.push("Points must be at least 0.01.");
	}

	switch (question.type) {
		case "SINGLE_CHOICE": {
			const options = question.options ?? [];

			if (options.length < 2) {
				errors.push("At least 2 options are required.");
			}

			if (options.some((option) => !option.text.trim())) {
				errors.push("Every option must contain text.");
			}

			const correctCount = options.filter((option) => option.isCorrect).length;

			if (correctCount !== 1) {
				errors.push("Exactly 1 option must be correct.");
			}

			break;
		}

		case "MULTIPLE_CHOICE": {
			const options = question.options ?? [];

			if (options.length < 2) {
				errors.push("At least 2 options are required.");
			}

			if (options.some((option) => !option.text.trim())) {
				errors.push("Every option must contain text.");
			}

			const correctCount = options.filter((option) => option.isCorrect).length;

			if (correctCount < 1) {
				errors.push("At least 1 option must be correct.");
			}

			break;
		}

		case "TRUE_FALSE":
			if (typeof question.correctBoolean !== "boolean") {
				errors.push("Select True or False.");
			}
			break;

		case "FILL_IN_THE_BLANK": {
			const answers = question.acceptedAnswers ?? [];

			if (answers.length === 0) {
				errors.push("At least 1 accepted answer is required.");
			}

			if (answers.some((answer) => !answer.trim())) {
				errors.push("Accepted answers cannot be empty.");
			}

			const normalizedAnswers = answers.map((answer) =>
				answer.trim().toLowerCase(),
			);

			if (normalizedAnswers.length !== new Set(normalizedAnswers).size) {
				errors.push("Accepted answers must be unique.");
			}

			break;
		}
	}

	return errors;
}

export function validateQuestions(
	questions: QuizQuestionInput[],
): Record<number, string[]> {
	const errors: Record<number, string[]> = {};

	questions.forEach((question, index) => {
		const questionErrors = validateQuestion(question);

		if (questionErrors.length > 0) {
			errors[index] = questionErrors;
		}
	});

	return errors;
}
