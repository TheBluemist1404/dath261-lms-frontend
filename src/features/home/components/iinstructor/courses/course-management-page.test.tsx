import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import CourseManagementPage from "./course-management-page";

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
});

describe("CourseManagementPage", () => {
	it("renders the initial course list", () => {
		render(<CourseManagementPage />);

		expect(
			screen.getByRole("heading", { name: "Course Management" }),
		).toBeInTheDocument();

		expect(screen.getByText("Introduction to Programming")).toBeInTheDocument();

		expect(screen.getByText("Computer Networks")).toBeInTheDocument();
	});

	it("filters courses by title or course code", async () => {
		const user = userEvent.setup();
		render(<CourseManagementPage />);

		await user.type(
			screen.getByRole("searchbox", { name: /search courses/i }),
			"CS201",
		);

		expect(screen.getByText("Computer Networks")).toBeInTheDocument();
		expect(
			screen.queryByText("Introduction to Programming"),
		).not.toBeInTheDocument();
	});

	it("shows an empty state when no courses match the search", async () => {
		const user = userEvent.setup();
		render(<CourseManagementPage />);

		await user.type(
			screen.getByRole("searchbox", { name: /search courses/i }),
			"NO-SUCH-COURSE",
		);

		expect(screen.getByText(/0 courses found/i)).toBeInTheDocument();
	});

	it("opens an empty form when Create Course is clicked", async () => {
		const user = userEvent.setup();
		render(<CourseManagementPage />);

		await user.click(screen.getByRole("button", { name: "Create Course" }));

		expect(
			screen.getByRole("heading", { name: "Create Course" }),
		).toBeInTheDocument();

		expect(screen.getByLabelText(/course title/i)).toHaveValue("");
		expect(screen.getByLabelText(/course code/i)).toHaveValue("");
	});

	it("shows validation errors and does not create an invalid course", async () => {
		const user = userEvent.setup();
		render(<CourseManagementPage />);

		await user.click(screen.getByRole("button", { name: "Create Course" }));

		// Submit the form without filling in its required fields.
		await user.click(screen.getByRole("button", { name: "Create Course" }));

		expect(screen.getByText("Course title is required.")).toBeInTheDocument();

		expect(screen.getByText("Course code is required.")).toBeInTheDocument();

		expect(screen.queryByText(/0 courses found/i)).not.toBeInTheDocument();
	});

	it("creates a course with valid data", async () => {
		const user = userEvent.setup();
		render(<CourseManagementPage />);

		await user.click(screen.getByRole("button", { name: "Create Course" }));

		await user.type(screen.getByLabelText(/school year/i), "2026-2027");

		await user.selectOptions(screen.getByLabelText(/semester/i), "Semester 1");

		await user.type(
			screen.getByLabelText(/course title/i),
			"Software Engineering",
		);

		await user.type(screen.getByLabelText(/course code/i), "SE101");

		await user.type(
			screen.getByLabelText(/course description/i),
			"Introduction to software engineering.",
		);

		await user.click(screen.getByRole("button", { name: "Create Course" }));

		expect(screen.getByText("Software Engineering")).toBeInTheDocument();

		expect(screen.getByText("SE101")).toBeInTheDocument();
		expect(screen.getByText(/3 courses found/i)).toBeInTheDocument();
	});

	it("opens the edit form with existing course values", async () => {
		const user = userEvent.setup();
		render(<CourseManagementPage />);

		const courseCard = screen
			.getByText("Introduction to Programming")
			.closest("article, .course-card");

		expect(courseCard).not.toBeNull();

		await user.click(
			within(courseCard as HTMLElement).getByRole("button", {
				name: "Edit",
			}),
		);

		expect(
			screen.getByRole("heading", { name: "Edit Course" }),
		).toBeInTheDocument();

		expect(screen.getByLabelText(/course title/i)).toHaveValue(
			"Introduction to Programming",
		);

		expect(screen.getByLabelText(/course code/i)).toHaveValue("CS101");
	});

	it("updates a course when the edit form is saved", async () => {
		const user = userEvent.setup();
		render(<CourseManagementPage />);

		const courseCard = screen
			.getByText("Introduction to Programming")
			.closest("article, .course-card") as HTMLElement;

		await user.click(within(courseCard).getByRole("button", { name: "Edit" }));

		const titleInput = screen.getByLabelText(/course title/i);

		await user.clear(titleInput);
		await user.type(titleInput, "Programming Fundamentals");

		await user.click(screen.getByRole("button", { name: "Save Changes" }));

		expect(screen.getByText("Programming Fundamentals")).toBeInTheDocument();

		expect(
			screen.queryByText("Introduction to Programming"),
		).not.toBeInTheDocument();
	});

	it("does not delete a course when deletion is cancelled", async () => {
		const user = userEvent.setup();
		const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);

		render(<CourseManagementPage />);

		const courseCard = screen
			.getByText("Introduction to Programming")
			.closest("article, .course-card") as HTMLElement;

		await user.click(
			within(courseCard).getByRole("button", { name: "Delete" }),
		);

		expect(confirmSpy).toHaveBeenCalled();
		expect(screen.getByText("Introduction to Programming")).toBeInTheDocument();
	});

	it("deletes a course when deletion is confirmed", async () => {
		const user = userEvent.setup();

		vi.spyOn(window, "confirm").mockReturnValue(true);

		render(<CourseManagementPage />);

		const courseCard = screen
			.getByText("Introduction to Programming")
			.closest("article, .course-card") as HTMLElement;

		await user.click(
			within(courseCard).getByRole("button", { name: "Delete" }),
		);

		expect(
			screen.queryByText("Introduction to Programming"),
		).not.toBeInTheDocument();

		expect(screen.getByText(/1 course found/i)).toBeInTheDocument();
	});

	it("toggles publication status in the current local-state implementation", async () => {
		const user = userEvent.setup();
		render(<CourseManagementPage />);

		const courseCard = screen
			.getByText("Introduction to Programming")
			.closest("article, .course-card") as HTMLElement;

		expect(within(courseCard).getByText("Published")).toBeInTheDocument();

		await user.click(within(courseCard).getByRole("button", { name: "Hide" }));

		expect(within(courseCard).getByText("Draft")).toBeInTheDocument();

		await user.click(
			within(courseCard).getByRole("button", { name: "Publish" }),
		);

		expect(within(courseCard).getByText("Published")).toBeInTheDocument();
	});
});
