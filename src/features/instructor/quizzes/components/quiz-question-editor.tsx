import { useId } from "react";
import { Button } from "@/components/ui/button";
import type {
	QuestionType,
	QuizOptionInput,
	QuizQuestionInput,
} from "../types/quiz.types";

export interface QuizQuestionEditorProps {
	question: QuizQuestionInput;
	errors?: readonly string[];
	onChange: (question: QuizQuestionInput) => void;
	onRemove: () => void;
}

const questionTypes: { value: QuestionType; label: string }[] = [
	{ value: "SINGLE_CHOICE", label: "Single choice" },
	{ value: "MULTIPLE_CHOICE", label: "Multiple choice" },
	{ value: "TRUE_FALSE", label: "True or false" },
	{ value: "FILL_IN_THE_BLANK", label: "Fill in the blank" },
];

const inputClassName =
	"mt-1 min-h-10 w-full rounded-lg border border-border bg-white px-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

function createOptions(): QuizOptionInput[] {
	return [
		{ text: "", isCorrect: false },
		{ text: "", isCorrect: false },
	];
}

function questionWithType(
	question: QuizQuestionInput,
	type: QuestionType,
): QuizQuestionInput {
	const nextQuestion: QuizQuestionInput = {
		...question,
		type,
		options: undefined,
		correctBoolean: undefined,
		acceptedAnswers: undefined,
	};

	switch (type) {
		case "SINGLE_CHOICE":
		case "MULTIPLE_CHOICE":
			nextQuestion.options = createOptions();
			break;
		case "TRUE_FALSE":
			nextQuestion.correctBoolean = false;
			break;
		case "FILL_IN_THE_BLANK":
			nextQuestion.acceptedAnswers = [""];
			break;
	}

	return nextQuestion;
}

export function QuizQuestionEditor({
	question,
	errors = [],
	onChange,
	onRemove,
}: QuizQuestionEditorProps) {
	const id = useId();
	const options = question.options ?? [];
	const acceptedAnswers = question.acceptedAnswers ?? [];
	const errorKeyOccurrences = new Map<string, number>();

	function updateQuestion(patch: Partial<QuizQuestionInput>) {
		onChange({ ...question, ...patch });
	}

	function updateOption(index: number, patch: Partial<QuizOptionInput>) {
		updateQuestion({
			options: options.map((option, optionIndex) =>
				optionIndex === index ? { ...option, ...patch } : option,
			),
		});
	}

	function updateAcceptedAnswer(index: number, value: string) {
		updateQuestion({
			acceptedAnswers: acceptedAnswers.map((answer, answerIndex) =>
				answerIndex === index ? value : answer,
			),
		});
	}

	return (
		<fieldset className="space-y-4 rounded-lg border border-border bg-canvas p-4">
			<legend className="px-1 text-sm font-semibold">Quiz question</legend>

			<div>
				<label htmlFor={`${id}-text`} className="block text-sm font-semibold">
					Question text
				</label>
				<textarea
					id={`${id}-text`}
					className={`${inputClassName} py-2`}
					rows={3}
					value={question.text}
					onChange={(event) => updateQuestion({ text: event.target.value })}
				/>
			</div>

			<div className="grid gap-4 sm:grid-cols-2">
				<div>
					<label
						htmlFor={`${id}-points`}
						className="block text-sm font-semibold"
					>
						Points
					</label>
					<input
						id={`${id}-points`}
						type="number"
						min="0"
						step="any"
						className={inputClassName}
						value={question.points ?? ""}
						onChange={(event) =>
							updateQuestion({
								points:
									event.target.value === ""
										? undefined
										: Number(event.target.value),
							})
						}
					/>
				</div>

				<div>
					<label htmlFor={`${id}-type`} className="block text-sm font-semibold">
						Question type
					</label>
					<select
						id={`${id}-type`}
						className={inputClassName}
						value={question.type}
						onChange={(event) => {
							const selectedType = questionTypes.find(
								({ value }) => value === event.target.value,
							)?.value;
							if (selectedType) {
								onChange(questionWithType(question, selectedType));
							}
						}}
					>
						{questionTypes.map(({ value, label }) => (
							<option key={value} value={value}>
								{label}
							</option>
						))}
					</select>
				</div>
			</div>

			{(question.type === "SINGLE_CHOICE" ||
				question.type === "MULTIPLE_CHOICE") && (
				<fieldset className="space-y-3">
					<legend className="text-sm font-semibold">Options</legend>
					{options.map((option, index) => {
						const optionId = `${id}-option-${index}`;
						const isSingleChoice = question.type === "SINGLE_CHOICE";

						return (
							<div key={optionId} className="flex flex-wrap items-end gap-3">
								<div className="min-w-48 flex-1">
									<label htmlFor={`${optionId}-text`} className="block text-sm">
										Option {index + 1}
									</label>
									<input
										id={`${optionId}-text`}
										className={inputClassName}
										value={option.text}
										onChange={(event) =>
											updateOption(index, { text: event.target.value })
										}
									/>
								</div>
								<label className="flex min-h-10 items-center gap-2 text-sm">
									<input
										type={isSingleChoice ? "radio" : "checkbox"}
										name={isSingleChoice ? `${id}-correct-option` : undefined}
										checked={option.isCorrect}
										onChange={() => {
											if (isSingleChoice) {
												updateQuestion({
													options: options.map((item, itemIndex) => ({
														...item,
														isCorrect: itemIndex === index,
													})),
												});
											} else {
												updateOption(index, {
													isCorrect: !option.isCorrect,
												});
											}
										}}
									/>
									Option {index + 1} is correct
								</label>
								<Button
									variant="ghost"
									aria-label={`Remove option ${index + 1}`}
									onClick={() =>
										updateQuestion({
											options: options.filter(
												(_, optionIndex) => optionIndex !== index,
											),
										})
									}
								>
									Remove
								</Button>
							</div>
						);
					})}
					<Button
						variant="secondary"
						onClick={() =>
							updateQuestion({
								options: [...options, { text: "", isCorrect: false }],
							})
						}
					>
						Add option
					</Button>
				</fieldset>
			)}

			{question.type === "TRUE_FALSE" && (
				<fieldset className="space-y-2">
					<legend className="text-sm font-semibold">Correct answer</legend>
					{[
						{ label: "True", value: true },
						{ label: "False", value: false },
					].map(({ label, value }) => (
						<label
							key={label}
							className="flex min-h-10 items-center gap-2 text-sm"
						>
							<input
								type="radio"
								name={`${id}-true-false`}
								value={String(value)}
								checked={question.correctBoolean === value}
								onChange={() => updateQuestion({ correctBoolean: value })}
							/>
							{label}
						</label>
					))}
				</fieldset>
			)}

			{question.type === "FILL_IN_THE_BLANK" && (
				<fieldset className="space-y-3">
					<legend className="text-sm font-semibold">Accepted answers</legend>
					{/* The API represents answers as strings without stable IDs. */}
					{acceptedAnswers.map((answer, index) => {
						const answerId = `${id}-answer-${index}`;

						return (
							<div key={answerId} className="flex gap-3">
								<div className="flex-1">
									<label htmlFor={answerId} className="block text-sm">
										Accepted answer {index + 1}
									</label>
									<input
										id={answerId}
										className={inputClassName}
										value={answer}
										onChange={(event) =>
											updateAcceptedAnswer(index, event.target.value)
										}
									/>
								</div>
								<Button
									variant="ghost"
									aria-label={`Remove accepted answer ${index + 1}`}
									onClick={() =>
										updateQuestion({
											acceptedAnswers: acceptedAnswers.filter(
												(_, answerIndex) => answerIndex !== index,
											),
										})
									}
								>
									Remove
								</Button>
							</div>
						);
					})}
					<Button
						variant="secondary"
						onClick={() =>
							updateQuestion({ acceptedAnswers: [...acceptedAnswers, ""] })
						}
					>
						Add answer
					</Button>
				</fieldset>
			)}

			{errors.length > 0 && (
				<ul
					role="alert"
					aria-label="Question validation errors"
					className="list-inside list-disc space-y-1 text-sm text-error"
				>
					{errors.map((error) => {
						const occurrence = errorKeyOccurrences.get(error) ?? 0;
						errorKeyOccurrences.set(error, occurrence + 1);
						return <li key={`${error}-${occurrence}`}>{error}</li>;
					})}
				</ul>
			)}

			<div className="flex justify-end border-t border-border pt-3">
				<Button variant="danger" onClick={onRemove}>
					Remove question
				</Button>
			</div>
		</fieldset>
	);
}
