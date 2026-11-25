import { expect, test } from "@playwright/test";
import {
	enrollFromCoursePage,
	registerAccount,
	runId,
	signInNewContext,
} from "./support";

/**
 * E2E-04: a lecturer builds a course in the UI (module, text lesson, quiz), publishes it,
 * a student finds and learns it, and the lecturer sees the student on the roster.
 * Fresh accounts and a unique course title each run.
 */

test("a lecturer authors and publishes a course that a student can then learn", async ({
	browser,
	request,
}) => {
	const lecturerEmail = await registerAccount(request, "LECTURER", "Minh");
	const studentEmail = await registerAccount(request, "STUDENT", "Thu");
	const title = `E2E Course ${runId()}`;

	// Lecturer: create a draft course.
	const lecturer = await signInNewContext(browser, lecturerEmail);
	const lp = lecturer.page;
	await lp.goto("/instructor/courses");
	await lp.getByRole("button", { name: "Create course" }).first().click();
	await lp.getByLabel("Course title").fill(title);
	await lp.getByLabel("Description").fill("Built by the E2E-04 test.");
	await lp.getByRole("button", { name: "Create Course", exact: true }).click();
	const row = lp.getByRole("row", { name: new RegExp(title) });
	await expect(row.getByRole("cell", { name: "Draft" })).toBeVisible();
	await row.getByRole("link", { name: title }).click();

	// A module with a text lesson inside it.
	await lp.getByRole("button", { name: "Add module" }).first().click();
	await lp.getByLabel("Title *").fill("Week 1");
	await lp.getByRole("button", { name: "Add block" }).click();
	const moduleCard = lp.getByRole("article").filter({ hasText: "Week 1" });
	await expect(
		moduleCard.getByRole("heading", { name: "Week 1" }),
	).toBeVisible();

	await moduleCard.getByRole("button", { name: "Add child" }).click();
	await lp.getByLabel("Title *").fill("First lesson");
	await lp.getByLabel("Block type").selectOption("TEXT");
	await lp.getByLabel("Markdown content *").fill("# Hello\nThis is **bold**.");
	await lp.getByRole("button", { name: "Add block" }).click();
	await expect(moduleCard.getByText("First lesson")).toBeVisible();

	// A one-question quiz.
	const courseUrl = lp.url();
	await lp.goto(`${courseUrl}/quizzes/new`);
	await lp.getByLabel("Quiz title").fill("Exit check");
	await lp.getByRole("button", { name: "Save quiz settings" }).click();
	await lp.getByRole("button", { name: "Add your first question" }).click();
	await lp.getByLabel("Question text").fill("Pick A");
	await lp.getByLabel("Option 1", { exact: true }).fill("A");
	await lp.getByLabel("Option 2", { exact: true }).fill("B");
	await lp.getByRole("radio", { name: "Option 1 is correct" }).check();
	await lp.getByRole("button", { name: "Add question" }).click();
	await expect(lp.getByText("1 question(s) ready.")).toBeVisible();
	await lp.getByRole("button", { name: "Create quiz" }).click();
	await expect(lp).toHaveURL(/\/quizzes\/[^/]+\/edit$/);

	// Publish.
	await lp.goto(courseUrl);
	await lp.getByRole("button", { name: "Publish course" }).click();
	await expect(
		lp.getByText(/currently published|Published/).first(),
	).toBeVisible();

	// Student: find it in the catalog, enroll, see the lessons in the lecturer's order.
	const student = await signInNewContext(browser, studentEmail);
	const sp = student.page;
	await sp.goto("/catalog");
	await sp.getByLabel("Search courses").fill(title);
	await sp
		.getByRole("link", { name: new RegExp(title) })
		.first()
		.click();
	await enrollFromCoursePage(sp);
	await sp.getByRole("link", { name: "Continue learning" }).click();

	const outline = sp.getByRole("navigation", { name: "Course syllabus" });
	await expect(outline.getByRole("button")).toHaveText([
		/First lesson/,
		/Exit check/,
	]);
	const lesson = sp.getByRole("region", { name: "Lesson content" });
	await expect(lesson.getByRole("heading", { name: "Hello" })).toBeVisible();
	await expect(lesson.getByText("bold", { exact: true })).toBeVisible();

	// Lecturer: the student is on the roster.
	await lp.goto(`${courseUrl}/students`);
	await expect(lp.getByText(studentEmail)).toBeVisible();

	await lecturer.context.close();
	await student.context.close();
});
