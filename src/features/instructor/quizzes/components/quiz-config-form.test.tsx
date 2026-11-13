import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { QuizConfigValues } from "./quiz-config-form";
import { QuizConfigForm } from "./quiz-config-form";

const initialQuiz = {
	title: "Midterm quiz",
	maxAttempts: 2,
	scoringMode: "HIGHEST" as const,
	availableFrom: "2030-01-01T10:00:00.000Z",
	deadline: "2030-01-02T10:00:00.000Z",
	allowLate: false,
};

describe("QuizConfigForm", () => {
	it("loads quiz values and saves edited configuration", async () => {
		const user = userEvent.setup();
		const onSave = vi.fn<(config: QuizConfigValues) => void>();

		render(<QuizConfigForm initialQuiz={initialQuiz} onSave={onSave} />);

		expect(screen.getByLabelText(/Quiz title/)).toHaveValue("Midterm quiz");
		expect(screen.getByLabelText("Maximum attempts")).toHaveValue(2);
		expect(screen.getByLabelText("Scoring mode")).toHaveValue("HIGHEST");
		expect(screen.getByLabelText("Available from")).toHaveValue(
			new Date(
				new Date(initialQuiz.availableFrom).getTime() -
					new Date(initialQuiz.availableFrom).getTimezoneOffset() * 60_000,
			)
				.toISOString()
				.slice(0, 16),
		);
		expect(screen.getByLabelText("Allow late submissions")).not.toBeChecked();
		expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();

		await user.clear(screen.getByLabelText(/Quiz title/));
		await user.type(screen.getByLabelText(/Quiz title/), "Final quiz");
		await user.clear(screen.getByLabelText("Maximum attempts"));
		await user.type(screen.getByLabelText("Maximum attempts"), "3");
		await user.selectOptions(screen.getByLabelText("Scoring mode"), "AVERAGE");
		await user.click(screen.getByLabelText("Allow late submissions"));
		await user.click(screen.getByRole("button", { name: "Save changes" }));

		expect(onSave).toHaveBeenCalledWith({
			title: "Final quiz",
			maxAttempts: 3,
			scoringMode: "AVERAGE",
			availableFrom: new Date(initialQuiz.availableFrom).toISOString(),
			deadline: new Date(initialQuiz.deadline).toISOString(),
			allowLate: true,
		});
		expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
	});

	it("shows validation errors and does not save invalid configuration", async () => {
		const user = userEvent.setup();
		const onSave = vi.fn();

		render(<QuizConfigForm initialQuiz={null} onSave={onSave} />);

		fireEvent.change(screen.getByLabelText(/Quiz title/), {
			target: { value: " " },
		});
		fireEvent.change(screen.getByLabelText("Maximum attempts"), {
			target: { value: "0" },
		});
		await user.click(screen.getByRole("button", { name: "Save changes" }));

		expect(screen.getByText("Quiz title is required.")).toHaveAttribute(
			"role",
			"alert",
		);
		expect(
			screen.getByText("Maximum attempts must be at least 1."),
		).toHaveAttribute("role", "alert");
		expect(onSave).not.toHaveBeenCalled();
	});

	it("shows a live date range error and refreshes when the quiz changes", async () => {
		const user = userEvent.setup();
		const onSave = vi.fn();
		const { rerender } = render(
			<QuizConfigForm initialQuiz={initialQuiz} onSave={onSave} />,
		);

		fireEvent.change(screen.getByLabelText("Available from"), {
			target: { value: "2030-01-03T10:00" },
		});
		expect(
			screen.getByText("Available-from time must be before the deadline."),
		).toBeInTheDocument();
		await user.click(screen.getByRole("button", { name: "Save changes" }));
		expect(onSave).not.toHaveBeenCalled();

		const updatedQuiz = { ...initialQuiz, title: "Updated quiz" };
		rerender(<QuizConfigForm initialQuiz={updatedQuiz} onSave={onSave} />);

		expect(screen.getByLabelText(/Quiz title/)).toHaveValue("Updated quiz");
		expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
		expect(
			screen.queryByText("Available-from time must be before the deadline."),
		).not.toBeInTheDocument();
	});
});
