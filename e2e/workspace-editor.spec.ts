import { expect, type Page, test } from "@playwright/test";

const personalPage = (pageId: string) =>
	`/workspace/ws-personal-alex/pages/${pageId}`;

const editor = (page: Page) =>
	page.locator('[aria-label="Page content"][contenteditable="true"]');

test("writes on a personal page and saves it", async ({ page }) => {
	await page.goto(personalPage("page-os-notes"));
	await editor(page).click();
	await page.keyboard.press("Control+End");
	await page.keyboard.press("Enter");
	await page.keyboard.type("## Exam topics");

	await expect(
		editor(page).getByRole("heading", { name: "Exam topics" }),
	).toBeVisible();
	await expect(page.getByText("All changes saved")).toBeVisible();
});

test("places a course reference in the text from the slash menu", async ({
	page,
}) => {
	await page.goto(personalPage("page-os-notes"));
	await editor(page).click();
	await page.keyboard.press("Control+End");
	await page.keyboard.press("Enter");
	await page.keyboard.type("/course");
	await page.getByText("Course reference", { exact: true }).click();

	const picker = page.getByRole("dialog", {
		name: "Insert a course reference",
	});
	await picker.getByRole("button", { name: "Video", exact: true }).click();
	await picker.getByRole("radio", { name: /CPU scheduling/ }).check();
	await picker.getByLabel("Start at timestamp (optional)").fill("12:05");
	await picker.getByRole("button", { name: "Insert reference" }).click();

	const card = editor(page).getByText("Lecture 3 · CPU scheduling");
	await expect(card).toBeVisible();
	await expect(editor(page).getByText(/Starts at 12:05/)).toBeVisible();

	// Writing continues below the reference.
	await page.keyboard.type("Notes after the video");
	await expect(editor(page).locator(".bn-block-content").last()).toHaveText(
		"Notes after the video",
	);
});

test("archives a page and restores it", async ({ page }) => {
	await page.goto(personalPage("page-os-notes"));
	await page.getByRole("button", { name: "Archive", exact: true }).click();
	await page
		.getByRole("dialog", { name: "Archive this page?" })
		.getByRole("button", { name: "Archive page" })
		.click();

	await expect(page.getByText("Page archived")).toBeVisible();
	await expect(
		page.locator('[aria-label="Page content"][contenteditable="false"]'),
	).toBeVisible();
	const tree = page.getByRole("navigation", { name: "Pages" });
	await expect(
		tree.getByRole("link", { name: "Operating systems notes" }),
	).toHaveCount(0);

	await page.getByRole("button", { name: "Restore page" }).click();
	await page
		.getByRole("dialog", { name: "Restore this page?" })
		.getByRole("button", { name: "Restore page" })
		.click();
	await expect(page.getByText("Page archived")).toBeHidden();
	await expect(editor(page)).toBeVisible();
	await expect(
		tree.getByRole("link", { name: "Operating systems notes" }),
	).toBeVisible();
});

test("fits a phone screen", async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto(personalPage("page-os-notes"));
	await expect(editor(page)).toBeVisible();

	const overflow = await page.evaluate(
		() => document.documentElement.scrollWidth - window.innerWidth,
	);
	expect(overflow).toBeLessThanOrEqual(0);
});
