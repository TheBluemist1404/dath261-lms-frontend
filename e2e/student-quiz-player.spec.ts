import { expect, test } from "@playwright/test";

test.describe("Student Quiz Player Flow", () => {
	test("opens course learn reader, completes quiz across all four question types, and updates course progress", async ({
		page,
	}) => {
		await page.goto("/courses/course-intro-cs/learn");

		await expect(
			page.getByRole("heading", {
				level: 1,
				name: "Introduction to Computer Science",
			}),
		).toBeVisible();

		const progressRegion = page.getByRole("region", {
			name: "Course progress",
		});
		await expect(progressRegion.getByText("60% (6/10 items)")).toBeVisible();
		await expect(progressRegion.getByText("66% (2/3 quizzes)")).toBeVisible();

		await page
			.getByRole("navigation", { name: "Course syllabus" })
			.getByRole("button", { name: /System Call Knowledge Check/i })
			.click();

		await expect(page).toHaveURL(
			/\/courses\/course-intro-cs\/learn\?blockId=block-1-3/,
		);
		await expect(
			page.getByRole("heading", {
				level: 2,
				name: "System Call Knowledge Check",
			}),
		).toBeVisible();
		await expect(
			page.getByText("Attempts used: 0 / 3", { exact: true }),
		).toBeVisible();

		await page.getByRole("button", { name: "Start quiz" }).click();

		await page.getByRole("radio", { name: "fork()" }).check();
		await page
			.getByRole("checkbox", {
				name: "Executing a system call trap instruction",
			})
			.check();
		await page
			.getByRole("checkbox", { name: "A hardware timer interrupt" })
			.check();
		await page
			.getByRole("checkbox", { name: "A page fault exception" })
			.check();
		await page.getByRole("radio", { name: "False" }).check();
		await page
			.getByRole("textbox", { name: /cpu execution mode/i })
			.fill("kernel mode");

		await expect(
			page.getByText("4 of 4 questions answered", { exact: true }),
		).toBeVisible();
		await page.getByRole("button", { name: "Review & submit" }).click();

		const dialog = page.getByRole("dialog", { name: "Submit your quiz?" });
		await expect(dialog).toBeVisible();
		await dialog.getByRole("button", { name: "Submit quiz" }).click();

		await expect(
			page.getByText("Quiz score: 100%", { exact: true }),
		).toBeVisible();
		await expect(page.getByText("Score: 100%", { exact: true })).toBeVisible();
		await expect(
			page.getByText("Attempt #1 submitted.", { exact: true }),
		).toBeVisible();
		await expect(
			page.getByText("Attempts used: 1 / 3", { exact: true }),
		).toBeVisible();
		await expect(
			page.getByText(/once the lecturer releases results/i),
		).toBeVisible();
		await expect(page.getByText(/Correct answer:/i)).toHaveCount(0);

		await expect(
			progressRegion.getByText("70% (7/10 items)", { exact: true }),
		).toBeVisible();
		await expect(
			progressRegion.getByText("100% (3/3 quizzes)", { exact: true }),
		).toBeVisible();

		await page.getByRole("button", { name: "Previous lesson" }).click();
		await expect(page).toHaveURL(
			/\/courses\/course-intro-cs\/learn\?blockId=block-1-2/,
		);
		await expect(
			page.getByRole("heading", {
				level: 2,
				name: "User Mode vs. Kernel Mode Traps",
			}),
		).toBeVisible();
	});
});
