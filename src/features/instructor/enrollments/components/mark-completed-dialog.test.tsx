import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MarkCompletedDialog } from "./mark-completed-dialog";

const student = {
	enrollmentId: "enrollment-1",
	status: "ACTIVE" as const,
	enrolledAt: "2026-10-01T08:00:00.000Z",
	completedAt: null,
	student: {
		id: "student-1",
		firstName: "Nguyen",
		lastName: "An",
		email: "an@example.com",
	},
	progress: {
		completedBlocks: 6,
		totalBlocks: 10,
		percent: 60,
	},
	quizScore: 85,
};

describe("MarkCompletedDialog", () => {
	it("confirms the selected active student", async () => {
		const user = userEvent.setup();
		const onConfirm = vi.fn();

		render(
			<MarkCompletedDialog
				student={student}
				onClose={vi.fn()}
				onConfirm={onConfirm}
			/>,
		);

		expect(
			screen.getByRole("heading", { name: "Mark student completed?" }),
		).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: "Confirm completed" }));

		expect(onConfirm).toHaveBeenCalledTimes(1);
	});
});
