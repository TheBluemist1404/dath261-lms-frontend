import { expect, test } from "@playwright/test";
import { enrollFromCoursePage, PASSWORD, runId, SEED_IDS } from "./support";

/**
 * E2E-03: a visitor browses the public catalog and course outline without an account,
 * registers as a student with separate first and last names, signs in and enrolls.
 */

test("a guest browses the catalog and outline, registers, signs in and enrolls", async ({
	page,
}) => {
	// Public catalog: published courses only.
	await page.goto("/catalog");
	await expect(
		page.getByRole("link", { name: /Algorithms/ }).first(),
	).toBeVisible();
	await expect(
		page.getByRole("link", { name: /Databases/ }).first(),
	).toBeVisible();
	await expect(page.getByText("Compilers (draft)")).toHaveCount(0);

	// Public course page shows the outline (titles only), not lesson content.
	await page
		.getByRole("link", { name: /Algorithms/ })
		.first()
		.click();
	await expect(page).toHaveURL(new RegExp(`/courses/${SEED_IDS.algorithms}$`));
	const syllabus = page.getByRole("region", { name: "Course Syllabus" });
	await expect(syllabus.getByText("Welcome to Algorithms")).toBeVisible();
	await expect(syllabus.getByText("Quiz 1")).toBeVisible();
	await expect(page.getByText("graph search", { exact: true })).toHaveCount(0);
	await expect(
		page.getByRole("link", { name: "Log in to enroll" }),
	).toBeVisible();

	// The reader needs an account.
	await page.goto(`/courses/${SEED_IDS.algorithms}/learn`);
	await expect(page).toHaveURL(/\/login/);

	// Register with first and last name, then sign in with the prefilled email.
	const email = `e2e-guest-${runId()}@example.com`;
	await page.goto("/register");
	await page.getByLabel("First name", { exact: true }).fill("Quynh");
	await page.getByLabel("Last name", { exact: true }).fill("Vo");
	await page.getByLabel("Email", { exact: true }).fill(email);
	await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
	await page.getByRole("button", { name: "Create account" }).click();
	await expect(page).toHaveURL(/\/login\?.*registered=true/);
	await expect(
		page.getByText("Account created successfully. Please log in."),
	).toBeVisible();
	await expect(page.getByLabel("Email", { exact: true })).toHaveValue(email);
	await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
	await page.getByRole("button", { name: "Log in" }).click();
	await expect(page).toHaveURL(/\/dashboard$/);

	// Enroll and open the reader.
	await page.goto(`/courses/${SEED_IDS.databases}`);
	await enrollFromCoursePage(page);
	await page.getByRole("link", { name: "Continue learning" }).click();
	await expect(
		page.getByRole("region", { name: "Lesson content" }).getByRole("heading", {
			level: 2,
			name: "What is a relational database?",
		}),
	).toBeVisible();
});
