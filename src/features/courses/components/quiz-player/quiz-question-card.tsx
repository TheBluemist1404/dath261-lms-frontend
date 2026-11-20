import { useId } from "react";
import type {
	DraftQuestionAnswer,
	StudentQuestionType,
	StudentQuizQuestion,
} from "../../types/student-quiz.types";

export interface QuizQuestionCardProps {
	question: StudentQuizQuestion;
	index: number;
	draft: DraftQuestionAnswer | undefined;
	disabled?: boolean;
	onChange: (nextDraft: DraftQuestionAnswer) => void;
}

function formatQuestionTypeLabel(type: StudentQuestionType): string {
	switch (type) {
		case "SINGLE_CHOICE":
			return "Single choice";
		case "MULTIPLE_CHOICE":
			return "Multiple choice";
		case "TRUE_FALSE":
			return "True / False";
		case "FILL_IN_BLANK":
			return "Fill in the blank";
		default: {
			const _exhaustive: never = type;
			return _exhaustive;
		}
	}
}

export function QuizQuestionCard({
	question,
	index,
	draft,
	disabled = false,
	onChange,
}: QuizQuestionCardProps) {
	const instanceId = useId();
	const promptId = `${instanceId}-prompt`;
	const inputId = `${instanceId}-input`;
	const radioGroupName = `quiz-question-${question.id}-${instanceId}`;
	const sortedOptions = [...(question.options ?? [])].sort(
		(a, b) => a.position - b.position,
	);

	function renderAnswerControls() {
		switch (question.type) {
			case "SINGLE_CHOICE": {
				const selectedOptionId =
					draft?.type === "SINGLE_CHOICE" ? draft.optionId : "";

				return (
					<div
						role="radiogroup"
						aria-labelledby={promptId}
						className="mt-4 flex flex-col gap-2.5"
					>
						{sortedOptions.map((option) => {
							const isSelected = selectedOptionId === option.id;
							return (
								<label
									key={option.id}
									className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm transition-colors ${
										isSelected
											? "border-primary bg-primary-subtle text-ink"
											: "border-border bg-white text-ink hover:bg-subtle"
									} ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
								>
									<input
										type="radio"
										name={radioGroupName}
										value={option.id}
										checked={isSelected}
										disabled={disabled}
										onChange={() =>
											onChange({
												type: "SINGLE_CHOICE",
												optionId: option.id,
											})
										}
										className="size-4 shrink-0 accent-primary"
									/>
									<span>{option.text}</span>
								</label>
							);
						})}
					</div>
				);
			}

			case "MULTIPLE_CHOICE": {
				const selectedOptionIds =
					draft?.type === "MULTIPLE_CHOICE" ? draft.optionIds : [];

				return (
					<fieldset
						aria-labelledby={promptId}
						className="mt-4 flex flex-col gap-2.5 border-0 p-0"
					>
						{sortedOptions.map((option) => {
							const isChecked = selectedOptionIds.includes(option.id);
							return (
								<label
									key={option.id}
									className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm transition-colors ${
										isChecked
											? "border-primary bg-primary-subtle text-ink"
											: "border-border bg-white text-ink hover:bg-subtle"
									} ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
								>
									<input
										type="checkbox"
										value={option.id}
										checked={isChecked}
										disabled={disabled}
										onChange={() => {
											const nextOptionIds = isChecked
												? selectedOptionIds.filter((id) => id !== option.id)
												: [...selectedOptionIds, option.id];
											onChange({
												type: "MULTIPLE_CHOICE",
												optionIds: nextOptionIds,
											});
										}}
										className="size-4 shrink-0 accent-primary"
									/>
									<span>{option.text}</span>
								</label>
							);
						})}
					</fieldset>
				);
			}

			case "TRUE_FALSE": {
				const selectedValue = draft?.type === "TRUE_FALSE" ? draft.value : null;
				const choices: readonly { label: string; value: boolean }[] = [
					{ label: "True", value: true },
					{ label: "False", value: false },
				];

				return (
					<div
						role="radiogroup"
						aria-labelledby={promptId}
						className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2"
					>
						{choices.map((choice) => {
							const isSelected = selectedValue === choice.value;
							return (
								<label
									key={choice.label}
									className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm transition-colors ${
										isSelected
											? "border-primary bg-primary-subtle text-ink"
											: "border-border bg-white text-ink hover:bg-subtle"
									} ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
								>
									<input
										type="radio"
										name={radioGroupName}
										value={String(choice.value)}
										checked={isSelected}
										disabled={disabled}
										onChange={() =>
											onChange({
												type: "TRUE_FALSE",
												value: choice.value,
											})
										}
										className="size-4 shrink-0 accent-primary"
									/>
									<span>{choice.label}</span>
								</label>
							);
						})}
					</div>
				);
			}

			case "FILL_IN_BLANK": {
				const textValue = draft?.type === "FILL_IN_BLANK" ? draft.text : "";

				return (
					<div className="mt-4 flex flex-col gap-2">
						<label htmlFor={inputId} className="text-xs font-medium text-muted">
							Your answer
							<span className="sr-only"> for {question.text}</span>
						</label>
						<input
							id={inputId}
							type="text"
							value={textValue}
							disabled={disabled}
							placeholder="Type your answer..."
							onChange={(event) =>
								onChange({
									type: "FILL_IN_BLANK",
									text: event.target.value,
								})
							}
							className="w-full rounded-xl border border-border bg-white px-4 py-2.5 text-sm text-ink placeholder:text-muted focus:border-primary focus:outline-none disabled:cursor-not-allowed disabled:bg-subtle disabled:opacity-60"
						/>
					</div>
				);
			}

			default: {
				const _exhaustive: never = question.type;
				return _exhaustive;
			}
		}
	}

	return (
		<article
			aria-labelledby={promptId}
			className="rounded-2xl border border-border bg-white p-5 sm:p-6"
		>
			<div className="flex flex-wrap items-center justify-between gap-2">
				<div className="flex items-center gap-2">
					<span className="text-xs font-semibold uppercase tracking-wider text-muted">
						Question {index + 1}
					</span>
					<span className="rounded-full bg-subtle px-2.5 py-0.5 text-xs font-medium text-muted">
						{formatQuestionTypeLabel(question.type)}
					</span>
				</div>
				<span className="rounded-full bg-primary-subtle px-2.5 py-0.5 text-xs font-semibold text-primary">
					{question.points} pts
				</span>
			</div>

			<h3
				id={promptId}
				className="mt-2 font-heading text-base font-semibold text-ink"
			>
				{question.text}
			</h3>

			{renderAnswerControls()}
		</article>
	);
}
