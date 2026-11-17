import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

import type { QuizQuestionInput } from "../types/quiz.types";

import { validateQuestion } from "../validation/quiz-validation";

import { QuizQuestionEditor } from "./quiz-question-editor";
import { QuizQuestionForm } from "./quiz-question-form";

export interface QuizQuestionListProps {
	questions: QuizQuestionInput[];

	onChange: (questions: QuizQuestionInput[]) => void;

	onSave?: () => Promise<void> | void;

	saving?: boolean;

	saveError?: string | null;
}

export function QuizQuestionList({
	questions,
	onChange,
	onSave,
	saving = false,
	saveError = null,
}: QuizQuestionListProps) {
	const [showAddForm, setShowAddForm] = useState(false);

	const [validationErrors, setValidationErrors] = useState<
		Record<number, string[]>
	>({});

	/*
	 * UI-only stable keys.
	 *
	 * These keys are never sent to the backend.
	 * They exist only so React does not use
	 * the array index as the component key.
	 */
	const questionKeys = useRef<string[]>([]);

	useEffect(() => {
		const keys = questionKeys.current;

		while (keys.length < questions.length) {
			keys.push(crypto.randomUUID());
		}

		if (keys.length > questions.length) {
			keys.splice(questions.length);
		}
	}, [questions.length]);

	function updateQuestion(index: number, question: QuizQuestionInput) {
		const next = [...questions];

		next[index] = question;

		onChange(next);

		setValidationErrors((current) => ({
			...current,
			[index]: [],
		}));
	}

	function removeQuestion(index: number) {
		const next = questions.filter(
			(_, questionIndex) => questionIndex !== index,
		);

		questionKeys.current.splice(index, 1);

		onChange(next);

		setValidationErrors({});
	}

	function addQuestion(question: QuizQuestionInput) {
		questionKeys.current.push(crypto.randomUUID());

		onChange([...questions, question]);

		setShowAddForm(false);

		setValidationErrors({});
	}

	async function saveQuestions() {
		const errors: Record<number, string[]> = {};

		questions.forEach((question, index) => {
			const questionErrors = validateQuestion(question);

			if (questionErrors.length > 0) {
				errors[index] = questionErrors;
			}
		});

		setValidationErrors(errors);

		if (Object.keys(errors).length > 0) {
			return;
		}

		if (!onSave) {
			return;
		}

		await onSave();
	}

	return (
		<section className="flex flex-col gap-5">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<h2 className="font-heading text-xl font-bold">Questions</h2>

					<p className="mt-1 text-sm text-muted">
						Author each question and define its answer key and points.
					</p>
				</div>

				<Button
					variant="secondary"
					onClick={() => setShowAddForm((current) => !current)}
				>
					{showAddForm ? "Cancel" : "Add question"}
				</Button>
			</div>

			{showAddForm && (
				<div className="rounded-xl border border-primary/20 bg-primary-subtle p-4">
					<QuizQuestionForm
						onAdd={addQuestion}
						onCancel={() => setShowAddForm(false)}
					/>
				</div>
			)}

			{questions.length === 0 ? (
				<div className="rounded-xl border border-dashed border-border bg-canvas p-8 text-center">
					<p className="font-semibold">No questions yet.</p>

					<p className="mt-1 text-sm text-muted">
						Add at least one question before creating the quiz.
					</p>

					<Button className="mt-4" onClick={() => setShowAddForm(true)}>
						Add your first question
					</Button>
				</div>
			) : (
				<div className="flex flex-col gap-4">
					{questions.map((question, index) => (
						<QuizQuestionEditor
							key={questionKeys.current[index]}
							question={question}
							errors={validationErrors[index] ?? []}
							onChange={(nextQuestion) => updateQuestion(index, nextQuestion)}
							onRemove={() => removeQuestion(index)}
						/>
					))}
				</div>
			)}

			{saveError && (
				<p
					role="alert"
					className="rounded-lg border border-error/20 bg-white px-3 py-2 text-sm text-error"
				>
					{saveError}
				</p>
			)}

			{onSave && (
				<div className="flex justify-end border-t border-border pt-4">
					<Button
						disabled={saving || questions.length === 0}
						onClick={() => void saveQuestions()}
					>
						{saving ? "Saving questions…" : "Save questions"}
					</Button>
				</div>
			)}
		</section>
	);
}
