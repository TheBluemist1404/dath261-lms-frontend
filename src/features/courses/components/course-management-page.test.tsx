import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test/render";
import type { Course } from "../types/course.types";
import CourseManagementPage from "./course-management-page";

const {
	listCourses,
	createCourse,
	updateCourse,
	deleteCourse,
	updateCourseStatus,
} = vi.hoisted(() => ({
	listCourses: vi.fn(),
	createCourse: vi.fn(),
	updateCourse: vi.fn(),
	deleteCourse: vi.fn(),
	updateCourseStatus: vi.fn(),
}));
vi.mock("../api/course.api", () => ({
	listCourses,
	createCourse,
	updateCourse,
	deleteCourse,
	updateCourseStatus,
}));
vi.mock("@tanstack/react-router", () => ({
	Link: ({
		to,
		params,
		children,
		...props
	}: {
		to: string;
		params?: { courseId?: string };
		children: React.ReactNode;
		[key: string]: unknown;
	}) => (
		<a href={to.replace("$courseId", params?.courseId ?? "")} {...props}>
			{children}
		</a>
	),
}));
const courses: Course[] = [
	{
		id: "c1",
		title: "Introduction to Programming",
		description: "Programming basics",
		prerequisites: null,
		status: "PUBLISHED",
		enrollmentStartAt: null,
		enrollmentEndAt: null,
		updatedAt: "2026-10-01T00:00:00.000Z",
		_count: { enrollments: 42 },
	},
	{
		id: "c2",
		title: "Computer Networks",
		description: "Networking protocols",
		prerequisites: null,
		status: "DRAFT",
		enrollmentStartAt: null,
		enrollmentEndAt: null,
		updatedAt: "2026-10-02T00:00:00.000Z",
		_count: { enrollments: 0 },
	},
];

function renderPage() {
	return renderWithProviders(<CourseManagementPage />);
}

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

describe("CourseManagementPage", () => {
	beforeEach(() => {
		vi.mocked(listCourses).mockImplementation(async () => courses);
		vi.mocked(createCourse).mockImplementation(async (input) => ({
			...courses[0],
			...input,
			id: "c3",
		}));
		vi.mocked(updateCourse).mockImplementation(async (id) => ({
			...courses[0],
			id,
		}));
		vi.mocked(deleteCourse).mockResolvedValue(undefined);
		vi.mocked(updateCourseStatus).mockImplementation(async (id, status) => ({
			...courses.find((course) => course.id === id)!,
			status,
		}));
	});
	it("loads server courses into the Figma-aligned table", async () => {
		renderPage();
		expect(
			await screen.findByRole("link", { name: "Introduction to Programming" }),
		).toBeInTheDocument();
		expect(screen.getByText("42")).toBeInTheDocument();
		expect(
			screen.getByRole("columnheader", { name: "Publication" }),
		).toBeInTheDocument();
	});
	it("filters by publication tab and search term", async () => {
		const user = userEvent.setup();
		renderPage();
		await screen.findByText("Computer Networks");
		await user.click(screen.getByRole("tab", { name: "Draft" }));
		expect(screen.getByText("Computer Networks")).toBeInTheDocument();
		expect(
			screen.queryByText("Introduction to Programming"),
		).not.toBeInTheDocument();
		await user.type(
			screen.getByRole("searchbox", { name: "Search courses" }),
			"unknown",
		);
		expect(screen.getByText("No courses found")).toBeInTheDocument();
	});
	it("validates the title before calling create API", async () => {
		const user = userEvent.setup();
		renderPage();
		await user.click(screen.getByRole("button", { name: "Create course" }));
		await user.click(screen.getByRole("button", { name: "Create Course" }));
		expect(
			await screen.findByText("Course title is required."),
		).toBeInTheDocument();
		expect(createCourse).not.toHaveBeenCalled();
	});
	it("creates a course and refreshes the server list", async () => {
		const user = userEvent.setup();
		renderPage();
		await user.click(screen.getByRole("button", { name: "Create course" }));
		await user.type(screen.getByLabelText(/Course title/), "Operating Systems");
		createCourse.mockResolvedValue({
			...courses[0],
			id: "c3",
			title: "Operating Systems",
			status: "DRAFT",
		});
		await user.click(screen.getByRole("button", { name: "Create Course" }));
		await waitFor(() =>
			expect(createCourse).toHaveBeenCalledWith(
				expect.objectContaining({
					title: "Operating Systems",
					status: "DRAFT",
					prerequisites: null,
				}),
			),
		);
	});
	it("publishes a draft through the course status API", async () => {
		const user = userEvent.setup();
		updateCourseStatus.mockResolvedValue({
			...courses[1],
			status: "PUBLISHED",
		});
		renderPage();
		await screen.findByText("Computer Networks");
		const row = screen.getByText("Computer Networks").closest("tr");
		if (!row) throw new Error("Course row not found");
		await user.click(within(row).getByRole("button", { name: "Publish" }));
		await waitFor(() =>
			expect(updateCourseStatus).toHaveBeenCalledWith("c2", "PUBLISHED"),
		);
	});
});
