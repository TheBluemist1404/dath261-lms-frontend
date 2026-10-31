import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import CourseManagementPage from "./course-management-page";

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
});

describe("CourseManagementPage", () => {
	function renderPage() {
		const user = userEvent.setup();
		render(<CourseManagementPage />);
		return user;
	}

	function getCourseCard(title: string): HTMLElement {
		const titleElement = screen.getByText(title);
		const card = titleElement.closest("article, .course-card");

		if (!card) {
			throw new Error(`Could not find course card for "${title}".`);
		}

		return card as HTMLElement;
	}

	it("renders the page and initial courses", () => {
		render(<CourseManagementPage />);

		expect(
			screen.getByRole("heading", { name: "Course Management" }),
		).toBeInTheDocument();

		expect(screen.getByText("Introduction to Programming")).toBeInTheDocument();
		expect(screen.getByText("Computer Networks")).toBeInTheDocument();
		expect(screen.getByText("2 courses found")).toBeInTheDocument();
	});

	it("filters courses by title", async () => {
		const user = renderPage();

		await user.type(
			screen.getByRole("searchbox", { name: /search courses/i }),
			"programming",
		);

		expect(screen.getByText("Introduction to Programming")).toBeInTheDocument();
		expect(screen.queryByText("Computer Networks")).not.toBeInTheDocument();
		expect(screen.getByText("1 course found")).toBeInTheDocument();
	});

	it("filters courses by course code without case sensitivity", async () => {
		const user = renderPage();

		await user.type(
			screen.getByRole("searchbox", { name: /search courses/i }),
			"cs201",
		);

		expect(screen.getByText("Computer Networks")).toBeInTheDocument();
		expect(
			screen.queryByText("Introduction to Programming"),
		).not.toBeInTheDocument();
	});

	it("shows the empty result count when no course matches", async () => {
		const user = renderPage();

		await user.type(
			screen.getByRole("searchbox", { name: /search courses/i }),
			"NO-SUCH-COURSE",
		);

		expect(screen.getByText("0 courses found")).toBeInTheDocument();
		expect(
			screen.queryByText("Introduction to Programming"),
		).not.toBeInTheDocument();
		expect(screen.queryByText("Computer Networks")).not.toBeInTheDocument();
	});

	it("opens a blank create form", async () => {
		const user = renderPage();

		await user.click(screen.getByRole("button", { name: "Create Course" }));

		expect(
			screen.getByRole("heading", { name: "Create Course" }),
		).toBeInTheDocument();

		expect(screen.getByLabelText(/course title/i)).toHaveValue("");
		expect(screen.getByLabelText(/course code/i)).toHaveValue("");
	});

	it("shows validation errors when required fields are empty", async () => {
		const user = renderPage();

		await user.click(screen.getByRole("button", { name: "Create Course" }));

		// The page and form both have a "Create Course" button.
		const submitButtons = screen.getAllByRole("button", {
			name: "Create Course",
		});
		await user.click(submitButtons[submitButtons.length - 1]);

		expect(screen.getByText("Course title is required.")).toBeInTheDocument();
		expect(screen.getByText("Course code is required.")).toBeInTheDocument();

		// Invalid submission must not add a course.
		expect(screen.getByText("2 courses found")).toBeInTheDocument();
	});

	it("creates a course with valid data", async () => {
		const user = renderPage();

		await user.click(screen.getByRole("button", { name: "Create Course" }));

		await user.type(screen.getByLabelText(/school year/i), "2026-2027");
		await user.selectOptions(screen.getByLabelText(/semester/i), "Semester 1");
		await user.type(
			screen.getByLabelText(/course title/i),
			"Software Engineering",
		);
		await user.type(screen.getByLabelText(/course code/i), "SE101");
		await user.type(
			screen.getByLabelText(/description/i),
			"Introduction to software engineering.",
		);

		const createButtons = screen.getAllByRole("button", {
			name: "Create Course",
		});

		await user.click(createButtons[createButtons.length - 1]);

		expect(screen.getByText("Software Engineering")).toBeInTheDocument();
		expect(screen.getByText("SE101")).toBeInTheDocument();
		expect(screen.getByText("3 courses found")).toBeInTheDocument();

		// Newly created courses start as drafts in the current implementation.
		expect(
			within(getCourseCard("Software Engineering")).getByText("Draft"),
		).toBeInTheDocument();
	});

	it("rejects a duplicate course code", async () => {
		const user = renderPage();

		// Open the create-course form.
		await user.click(screen.getByRole("button", { name: "Create Course" }));

		await user.type(screen.getByLabelText(/school year/i), "2026-2027");
		await user.selectOptions(screen.getByLabelText(/semester/i), "Semester 1");
		await user.type(
			screen.getByLabelText(/course title/i),
			"Another Programming Course",
		);
		await user.type(screen.getByLabelText(/course code/i), "cs101");
		await user.type(
			screen.getByLabelText(/description/i),
			"A course with a duplicate code.",
		);

		// Click the form's submit button (the second matching button).
		const createButtons = screen.getAllByRole("button", {
			name: "Create Course",
		});
		await user.click(createButtons[createButtons.length - 1]);

		expect(screen.getByRole("alert")).toHaveTextContent(
			"A course with this course code already exists.",
		);
		expect(screen.getByText("2 courses found")).toBeInTheDocument();
	});
	it("opens the edit form with existing course data", async () => {
		const user = renderPage();

		await user.click(
			within(getCourseCard("Introduction to Programming")).getByRole("button", {
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

	it("updates a course without adding another course", async () => {
		const user = renderPage();

		await user.click(
			within(getCourseCard("Introduction to Programming")).getByRole("button", {
				name: "Edit",
			}),
		);

		const titleInput = screen.getByLabelText(/course title/i);
		await user.clear(titleInput);
		await user.type(titleInput, "Programming Fundamentals");

		await user.click(screen.getByRole("button", { name: "Save Changes" }));

		expect(screen.getByText("Programming Fundamentals")).toBeInTheDocument();
		expect(
			screen.queryByText("Introduction to Programming"),
		).not.toBeInTheDocument();
		expect(screen.getByText("2 courses found")).toBeInTheDocument();
	});

	it("allows a course to keep its existing course code when edited", async () => {
		const user = renderPage();

		await user.click(
			within(getCourseCard("Introduction to Programming")).getByRole("button", {
				name: "Edit",
			}),
		);

		const titleInput = screen.getByLabelText(/course title/i);
		await user.clear(titleInput);
		await user.type(titleInput, "Programming Fundamentals");

		// Keep CS101 unchanged: it must not count as a duplicate of itself.
		await user.click(screen.getByRole("button", { name: "Save Changes" }));

		expect(screen.getByText("Programming Fundamentals")).toBeInTheDocument();
		expect(screen.getByText("CS101")).toBeInTheDocument();
		expect(screen.getByText("2 courses found")).toBeInTheDocument();
	});

	it("does not delete a course when confirmation is cancelled", async () => {
		const user = renderPage();
		const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);

		await user.click(
			within(getCourseCard("Introduction to Programming")).getByRole("button", {
				name: "Delete",
			}),
		);

		expect(confirmSpy).toHaveBeenCalled();
		expect(screen.getByText("Introduction to Programming")).toBeInTheDocument();
		expect(screen.getByText("2 courses found")).toBeInTheDocument();
	});

	it("deletes a course when deletion is confirmed", async () => {
		const user = renderPage();
		vi.spyOn(window, "confirm").mockReturnValue(true);

		await user.click(
			within(getCourseCard("Introduction to Programming")).getByRole("button", {
				name: "Delete",
			}),
		);

		expect(
			screen.queryByText("Introduction to Programming"),
		).not.toBeInTheDocument();
		expect(screen.getByText("Computer Networks")).toBeInTheDocument();
		expect(screen.getByText("1 course found")).toBeInTheDocument();
	});

	it("toggles a course between published and draft states", async () => {
		const user = renderPage();
		const card = getCourseCard("Introduction to Programming");

		expect(within(card).getByText("Published")).toBeInTheDocument();

		await user.click(within(card).getByRole("button", { name: "Hide" }));

		expect(within(card).getByText("Draft")).toBeInTheDocument();

		await user.click(within(card).getByRole("button", { name: "Publish" }));

		expect(within(card).getByText("Published")).toBeInTheDocument();
	});
});
