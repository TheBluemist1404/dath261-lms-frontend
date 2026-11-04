import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { mockCourseBlocks } from "@/mocks/courses.fixtures";
import { CourseSyllabusAccordion } from "./course-syllabus-accordion";

describe("CourseSyllabusAccordion", () => {
	it("renders modules and toggles accordion items", async () => {
		const user = userEvent.setup();
		render(<CourseSyllabusAccordion blocks={mockCourseBlocks} />);

		expect(
			screen.getByRole("heading", { level: 2, name: "Course Syllabus" }),
		).toBeInTheDocument();
		expect(
			screen.getByText("Module 1: Kernel Architecture & System Calls"),
		).toBeVisible();

		expect(
			screen.getByText("Introduction to Operating System Abstractions"),
		).toBeVisible();

		const mod1Button = screen.getByRole("button", {
			name: /Module 1: Kernel Architecture & System Calls/,
		});
		await user.click(mod1Button);

		expect(
			screen.queryByText("Introduction to Operating System Abstractions"),
		).not.toBeInTheDocument();
	});

	it("handles empty blocks gracefully", () => {
		render(<CourseSyllabusAccordion blocks={[]} />);
		expect(
			screen.getByText(/syllabus for this course is being assembled/),
		).toBeVisible();
	});
});
