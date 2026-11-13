import { useState } from "react";

import { Button } from "@/components/ui/button";

import type { QuizQuestionInput } from "../types/quiz.types";

import { validateQuestion } from "../validation/quiz-validation";

import { QuizQuestionEditor } from "./quiz-question-editor";

interface QuizQuestionFormProps {
	onAdd: (question: QuizQuestionInput) => void;

	onCancel: () => void;
}

function createEmptyQuestion(): QuizQuestionInput {
	return {
		type: "SINGLE_CHOICE",
		text: "",
		points: 1,
		options: [
			{
				text: "",
				isCorrect: false,
			},
			{
				text: "",
				isCorrect: false,
			},
		],
	};
}

export function QuizQuestionForm({ onAdd, onCancel }: QuizQuestionFormProps) {
	const [question, setQuestion] = useState<QuizQuestionInput>(
		createEmptyQuestion(),
	);

	const [errors, setErrors] = useState<string[]>([]);

	function submit() {
		const validationErrors = validateQuestion(question);

		if (validationErrors.length > 0) {
			setErrors(validationErrors);
			return;
		}

		onAdd(question);

		setQuestion(createEmptyQuestion());

		setErrors([]);
	}

	return (
		<div className="flex flex-col gap-4">
			<QuizQuestionEditor
				question={question}
				errors={errors}
				onChange={(nextQuestion) => {
					setQuestion(nextQuestion);
					setErrors([]);
				}}
				onRemove={onCancel}
			/>

			<div className="flex justify-end gap-3 border-t border-border pt-4">
				<Button variant="secondary" onClick={onCancel}>
					Cancel
				</Button>

				<Button onClick={submit}>Add question</Button>
			</div>
		</div>
	);
}
