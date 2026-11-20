import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { createTestQueryClient } from "@/test/render";
import { getStudentProgress } from "../api/instructor-enrollment.api";
import { StudentProgressDetail } from "./student-progress-detail";

vi.mock("../api/instructor-enrollment.api", () => ({
	getStudentProgress: vi.fn(),
	completeEnrollment: vi.fn(),
	getCourseRoster: vi.fn(),
}));
vi.mock("@tanstack/react-router", () => ({
	Link: ({ children }: { children: ReactNode }) => <a href="/">{children}</a>,
}));
describe("StudentProgressDetail", () => {
	it("renders overall and per-block progress", async () => {
		vi.mocked(getStudentProgress).mockResolvedValue({
			enrollment: {
				id: "enrollment-1",
				status: "ACTIVE",
				enrolledAt: "2026-10-01T08:00:00.000Z",
				leftAt: null,
				completedAt: null,
			},
			student: {
				id: "student-1",
				firstName: "Nguyen",
				lastName: "An",
				email: "an@example.com",
			},
			progress: {
				totalItems: 10,
				completedItems: 6,
				learningProgressPercentage: 60,
				totalQuizzes: 3,
				completedQuizzes: 2,
				quizCompletionPercentage: 66.67,
			},
			items: [
				{
					courseBlockId: "block-1",
					type: "TEXT",
					title: "Introduction",
					position: 1,
					parentModuleId: null,
					completed: true,
					completedAt: "2026-10-02T08:00:00.000Z",
				},
			],
			quizAttempts: [],
			assignmentSubmissions: [],
		});

		const client = createTestQueryClient();

		render(
			<QueryClientProvider client={client}>
				<StudentProgressDetail
					courseId="course-1"
					enrollmentId="enrollment-1"
				/>
			</QueryClientProvider>,
		);

		expect(await screen.findByText("Nguyen An")).toBeInTheDocument();
		expect(screen.getByText("60%")).toBeInTheDocument();
		expect(screen.getByText("Introduction")).toBeInTheDocument();
	});
});
