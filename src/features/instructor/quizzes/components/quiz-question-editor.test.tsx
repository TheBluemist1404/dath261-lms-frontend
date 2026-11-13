import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import type { QuizQuestionInput } from "../types/quiz.types";
import { QuizQuestionEditor } from "./quiz-question-editor";

const choiceQuestion: QuizQuestionInput = {
	type: "SINGLE_CHOICE",
	text: "Which answer is correct?",
	points: 2,
	options: [
		{ text: "First", isCorrect: true },
		{ text: "Second", isCorrect: false },
	],
};

function ControlledQuizQuestionEditor({
	question,
	onChange,
}: {
	question: QuizQuestionInput;
	onChange: (question: QuizQuestionInput) => void;
}) {
	const [currentQuestion, setCurrentQuestion] = useState(question);

	return (
		<QuizQuestionEditor
			question={currentQuestion}
			onChange={(nextQuestion) => {
				onChange(nextQuestion);
				setCurrentQuestion(nextQuestion);
			}}
			onRemove={vi.fn()}
		/>
	);
}

describe("QuizQuestionEditor", () => {
	it("updates question text and points and displays validation errors", () => {
		const onChange = vi.fn();

		render(
			<QuizQuestionEditor
				question={choiceQuestion}
				errors={["Choose a correct answer."]}
				onChange={onChange}
				onRemove={vi.fn()}
			/>,
		);

		fireEvent.change(screen.getByLabelText("Question text"), {
			target: { value: "Updated question" },
		});
		expect(onChange).toHaveBeenLastCalledWith({
			...choiceQuestion,
			text: "Updated question",
		});

		fireEvent.change(screen.getByLabelText("Points"), {
			target: { value: "2.5" },
		});
		expect(onChange).toHaveBeenLastCalledWith({
			...choiceQuestion,
			points: 2.5,
		});
		expect(screen.getByRole("alert")).toHaveTextContent(
			"Choose a correct answer.",
		);
	});

	it("enforces one correct option for single-choice questions", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();

		render(
			<QuizQuestionEditor
				question={choiceQuestion}
				onChange={onChange}
				onRemove={vi.fn()}
			/>,
		);

		await user.click(
			screen.getByRole("radio", { name: "Option 2 is correct" }),
		);
		expect(onChange).toHaveBeenLastCalledWith({
			...choiceQuestion,
			options: [
				{ text: "First", isCorrect: false },
				{ text: "Second", isCorrect: true },
			],
		});
	});

	it("toggles multiple correct options independently and supports option changes", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();
		const question: QuizQuestionInput = {
			...choiceQuestion,
			type: "MULTIPLE_CHOICE",
			options: choiceQuestion.options?.map((option) => ({
				...option,
				isCorrect: false,
			})),
		};

		render(
			<ControlledQuizQuestionEditor question={question} onChange={onChange} />,
		);

		await user.click(
			screen.getByRole("checkbox", { name: "Option 1 is correct" }),
		);
		expect(onChange).toHaveBeenLastCalledWith({
			...question,
			options: [
				{ text: "First", isCorrect: true },
				{ text: "Second", isCorrect: false },
			],
		});
		await user.click(
			screen.getByRole("checkbox", { name: "Option 2 is correct" }),
		);
		const allCorrectQuestion = {
			...question,
			options: [
				{ text: "First", isCorrect: true },
				{ text: "Second", isCorrect: true },
			],
		};
		expect(onChange).toHaveBeenLastCalledWith({
			...allCorrectQuestion,
		});

		await user.click(screen.getByRole("button", { name: "Add option" }));
		expect(onChange).toHaveBeenLastCalledWith({
			...allCorrectQuestion,
			options: [
				{ text: "First", isCorrect: true },
				{ text: "Second", isCorrect: true },
				{ text: "", isCorrect: false },
			],
		});
		fireEvent.change(screen.getByLabelText("Option 3"), {
			target: { value: "Third" },
		});
		expect(onChange).toHaveBeenLastCalledWith({
			...allCorrectQuestion,
			options: [
				{ text: "First", isCorrect: true },
				{ text: "Second", isCorrect: true },
				{ text: "Third", isCorrect: false },
			],
		});
		await user.click(screen.getByRole("button", { name: "Remove option 3" }));
		expect(onChange).toHaveBeenLastCalledWith(allCorrectQuestion);
	});

	it("initializes the selected question type while retaining common fields", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();

		render(
			<QuizQuestionEditor
				question={choiceQuestion}
				onChange={onChange}
				onRemove={vi.fn()}
			/>,
		);

		await user.selectOptions(
			screen.getByLabelText("Question type"),
			"TRUE_FALSE",
		);
		expect(onChange).toHaveBeenLastCalledWith({
			type: "TRUE_FALSE",
			text: choiceQuestion.text,
			points: choiceQuestion.points,
			options: undefined,
			correctBoolean: false,
			acceptedAnswers: undefined,
		});
	});

	it("edits accepted answers and the true/false correct answer", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();
		const fillInTheBlankQuestion: QuizQuestionInput = {
			type: "FILL_IN_THE_BLANK",
			text: "Enter the missing word.",
			acceptedAnswers: ["answer"],
		};

		const { rerender } = render(
			<ControlledQuizQuestionEditor
				question={fillInTheBlankQuestion}
				onChange={onChange}
			/>,
		);

		fireEvent.change(screen.getByLabelText("Accepted answer 1"), {
			target: { value: "updated" },
		});
		expect(onChange).toHaveBeenLastCalledWith({
			...fillInTheBlankQuestion,
			acceptedAnswers: ["updated"],
		});
		await user.click(screen.getByRole("button", { name: "Add answer" }));
		expect(onChange).toHaveBeenLastCalledWith({
			...fillInTheBlankQuestion,
			acceptedAnswers: ["updated", ""],
		});
		await user.click(
			screen.getByRole("button", { name: "Remove accepted answer 1" }),
		);
		expect(onChange).toHaveBeenLastCalledWith({
			...fillInTheBlankQuestion,
			acceptedAnswers: [""],
		});

		rerender(
			<QuizQuestionEditor
				question={{
					...choiceQuestion,
					type: "TRUE_FALSE",
					correctBoolean: false,
				}}
				onChange={onChange}
				onRemove={vi.fn()}
			/>,
		);
		await user.click(screen.getByRole("radio", { name: "True" }));
		expect(onChange).toHaveBeenLastCalledWith({
			...choiceQuestion,
			type: "TRUE_FALSE",
			correctBoolean: true,
		});
	});

	it("calls onRemove when the question is removed", async () => {
		const user = userEvent.setup();
		const onRemove = vi.fn();

		render(
			<QuizQuestionEditor
				question={choiceQuestion}
				onChange={vi.fn()}
				onRemove={onRemove}
			/>,
		);

		await user.click(screen.getByRole("button", { name: "Remove question" }));
		expect(onRemove).toHaveBeenCalledOnce();
	});
});
