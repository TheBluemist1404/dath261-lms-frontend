import { expect, test } from "@playwright/test";
import {
	enrollFromCoursePage,
	registerAccount,
	SEED_IDS,
	signIn,
} from "./support";

/**
 * E2E-01 (FE #60): the student learning flow against the real backend on the dev seed.
 * A fresh student each run, so enrolment and the quiz attempt never depend on an
 * earlier run. Algorithms has four items: a text lesson, slides, a lecture video and
 * Quiz 1 (answers: a queue, false, Prim's + Kruskal's).
 */

test("a student finds a course, enrolls, learns, resumes, takes the quiz and sees progress everywhere", async ({
	page,
	request,
}) => {
	const email = await registerAccount(request, "STUDENT", "Linh");
	await signIn(page, email);

	// 1. Search the catalog.
	await page.goto("/catalog");
	await page.getByLabel("Search courses").fill("Algorithms");
	const card = page.getByRole("link", { name: /Algorithms/ }).first();
	await expect(card).toBeVisible();
	await expect(page.getByRole("link", { name: /Databases/ })).toHaveCount(0);
	await card.click();

	// 2. Enroll and open the reader.
	await expect(page).toHaveURL(new RegExp(`/courses/${SEED_IDS.algorithms}$`));
	await enrollFromCoursePage(page);
	await page.getByRole("link", { name: "Continue learning" }).click();
	await expect(page).toHaveURL(
		new RegExp(`/courses/${SEED_IDS.algorithms}/learn`),
	);

	const progress = page.getByRole("region", { name: "Course progress" });
	const lesson = page.getByRole("region", { name: "Lesson content" });
	const outline = page.getByRole("navigation", { name: "Course syllabus" });
	await expect(progress.getByText("0% (0/4 items)")).toBeVisible();
	await expect(
		lesson.getByRole("heading", { level: 2, name: "Welcome to Algorithms" }),
	).toBeVisible();
	await expect(lesson.getByText("graph search", { exact: true })).toBeVisible();

	// 3. Complete the text lesson; progress updates and survives a reload.
	await lesson.getByRole("button", { name: "Mark as complete" }).click();
	await expect(lesson.getByText("Lesson completed")).toBeVisible();
	await expect(progress.getByText("25% (1/4 items)")).toBeVisible();
	await page.reload();
	await expect(progress.getByText("25% (1/4 items)")).toBeVisible();
	await expect(
		outline
			.getByRole("button", { name: /Welcome to Algorithms/ })
			.getByText("Completed"),
	).toBeVisible();

	// Move on to the lecture, then come back without a lesson in the link: it resumes there.
	await outline.getByRole("button", { name: /Graph search lecture/ }).click();
	await expect(lesson.getByLabel("Lesson video")).toBeVisible();
	await page.goto(`/courses/${SEED_IDS.algorithms}/learn`);
	await expect(
		lesson.getByRole("heading", { level: 2, name: "Graph search lecture" }),
	).toBeVisible();

	// 4. Take the auto-graded quiz.
	await outline.getByRole("button", { name: /Quiz 1/ }).click();
	await expect(
		page.getByText("Attempts used: 0 / 3", { exact: true }),
	).toBeVisible();
	await page.getByRole("button", { name: "Start quiz" }).click();
	await page.getByRole("radio", { name: "A queue" }).check();
	await page.getByRole("radio", { name: "False" }).check();
	await page.getByRole("checkbox", { name: "Prim's algorithm" }).check();
	await page.getByRole("checkbox", { name: "Kruskal's algorithm" }).check();
	await expect(
		page.getByText("3 of 3 questions answered", { exact: true }),
	).toBeVisible();
	await page.getByRole("button", { name: "Review & submit" }).click();
	await page
		.getByRole("dialog", { name: "Submit your quiz?" })
		.getByRole("button", { name: "Submit quiz" })
		.click();

	await expect(
		page.getByText("Quiz score: 100%", { exact: true }),
	).toBeVisible();
	await expect(
		page.getByText("Attempts used: 1 / 3", { exact: true }),
	).toBeVisible();
	await expect(progress.getByText("50% (2/4 items)")).toBeVisible();
	await expect(progress.getByText("100% (1/1 quizzes)")).toBeVisible();

	// 5. Dashboard and My Courses show the new progress.
	await page.goto("/dashboard");
	await expect(
		page.getByRole("progressbar", { name: "Learning progress for Algorithms" }),
	).toHaveAttribute("aria-valuenow", "50");

	await page.goto("/my-courses");
	const myCourse = page
		.getByRole("article")
		.filter({ hasText: "Algorithms" })
		.first();
	await expect(myCourse.getByText("50%")).toBeVisible();
	await myCourse.getByRole("link", { name: "Resume Learning" }).click();
	await expect(
		lesson.getByRole("heading", { level: 2, name: "Quiz 1" }),
	).toBeVisible();
});
