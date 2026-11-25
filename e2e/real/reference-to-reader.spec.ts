import { expect, test } from "@playwright/test";
import { SEED, SEED_IDS, signIn } from "./support";

/**
 * E2E-06 (FE #27): a course reference on a workspace page opens the course reader on
 * that block, and a video reference starts at its stored time. Seed data: the "Graph
 * search" page references the Algorithms lecture at 1:35 and the Databases handout,
 * and the seeded student is enrolled in Algorithms only.
 */

test("a video reference opens the reader at its timestamp; a reference to a course the student is not in stays locked", async ({
	page,
}) => {
	await signIn(page, SEED.student);
	await page.goto(
		`/workspace/${SEED_IDS.workspace}/pages/${SEED_IDS.graphsPage}`,
	);

	const references = page.getByRole("region", { name: "Course references" });
	await expect(references.getByText("Graph search lecture")).toBeVisible();
	await expect(references.getByText(/Starts at 1:35/)).toBeVisible();
	await expect(references.getByText("Protected reference")).toBeVisible();

	await references.getByRole("link", { name: /Open source/ }).click();

	await expect(page).toHaveURL(
		new RegExp(
			`/courses/${SEED_IDS.algorithms}/learn\\?(.*&)?block(Id)?=${SEED_IDS.lecture}`,
		),
	);
	const lesson = page.getByRole("region", { name: "Lesson content" });
	await expect(
		lesson.getByRole("heading", { level: 2, name: "Graph search lecture" }),
	).toBeVisible();
	await expect(lesson.getByText("Resume at 1:35 (95s)")).toBeVisible();
	await expect(lesson.getByLabel("Lesson video")).toHaveAttribute(
		"src",
		/graph-search\.mp4#t=95$/,
	);
	await expect(
		page
			.getByRole("navigation", { name: "Course syllabus" })
			.getByRole("button", { name: /Graph search lecture/ }),
	).toHaveAttribute("aria-current", "step");
});

test("a student who is not enrolled is sent to the course page instead of the reader", async ({
	page,
}) => {
	await signIn(page, SEED.classmate);
	await page.goto(
		`/courses/${SEED_IDS.algorithms}/learn?block=${SEED_IDS.lecture}&t=95`,
	);

	await expect(page).toHaveURL(new RegExp(`/courses/${SEED_IDS.algorithms}$`));
	await expect(page.getByText("Graph search lecture")).toBeVisible();
	await expect(page.getByLabel("Lesson video")).toHaveCount(0);
});
