import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createTestQueryClient } from "@/test/render";
import {
	completeEnrollment,
	getCourseRoster,
} from "../api/instructor-enrollment.api";
import { StudentRoster } from "./student-roster";

vi.mock("../api/instructor-enrollment.api", () => ({
	getCourseRoster: vi.fn(),
	completeEnrollment: vi.fn(),
	getStudentProgress: vi.fn(),
}));

const activeStudent = {
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
	quizScore: 85.5,
};

const completedStudent = {
	...activeStudent,
	enrollmentId: "enrollment-2",
	status: "COMPLETED" as const,
	completedAt: "2026-11-01T08:00:00.000Z",
	student: {
		...activeStudent.student,
		id: "student-2",
		firstName: "Tran",
		lastName: "Binh",
		email: "binh@example.com",
	},
	progress: {
		completedBlocks: 10,
		totalBlocks: 10,
		percent: 100,
	},
	quizScore: 92,
};

function renderRoster() {
	const client = createTestQueryClient();

	return render(
		<QueryClientProvider client={client}>
			<StudentRoster courseId="course-1" />
		</QueryClientProvider>,
	);
}

afterEach(() => {
	vi.clearAllMocks();
});

describe("StudentRoster", () => {
	it("renders roster data and only offers completion for ACTIVE students", async () => {
		vi.mocked(getCourseRoster).mockResolvedValue({
			data: [activeStudent, completedStudent],
			meta: {
				total: 2,
				page: 1,
				limit: 20,
				totalPages: 1,
				hasNextPage: false,
				hasPreviousPage: false,
			},
		});

		renderRoster();

		expect(await screen.findByText("Nguyen An")).toBeInTheDocument();
		expect(screen.getByText("Tran Binh")).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Mark completed" }),
		).toBeInTheDocument();
		expect(
			screen.getByText("Completed", { selector: "span" }),
		).toBeInTheDocument();
	});

	it("opens confirmation and calls complete endpoint only after confirmation", async () => {
		const user = userEvent.setup();

		vi.mocked(getCourseRoster).mockResolvedValue({
			data: [activeStudent],
			meta: {
				total: 1,
				page: 1,
				limit: 20,
				totalPages: 1,
				hasNextPage: false,
				hasPreviousPage: false,
			},
		});
		vi.mocked(completeEnrollment).mockResolvedValue({
			enrollmentId: "enrollment-1",
			status: "COMPLETED",
			completedAt: "2026-11-20T03:00:00.000Z",
		});

		renderRoster();

		await user.click(
			await screen.findByRole("button", { name: "Mark completed" }),
		);

		expect(
			screen.getByRole("heading", { name: "Mark student completed?" }),
		).toBeInTheDocument();
		expect(completeEnrollment).toHaveBeenCalledTimes(0);

		await user.click(screen.getByRole("button", { name: "Confirm completed" }));

		await waitFor(() => {
			expect(completeEnrollment).toHaveBeenCalledWith(
				"course-1",
				"enrollment-1",
			);
		});
	});
});
