import { expect, test } from "@playwright/test";

test.describe("Student dashboard", () => {
	test("redirects a signed-in student from / to /dashboard and resumes learning", async ({
		page,
	}) => {
		await page.goto("/");
		await expect(page).toHaveURL(/\/dashboard/);

		const continueSection = page.getByRole("region", {
			name: "Continue learning",
		});
		await expect(continueSection).toBeVisible();
		await expect(
			continueSection.getByRole("heading", {
				level: 2,
				name: "Lecture 1: Computational Thinking",
			}),
		).toBeVisible();

		await continueSection
			.getByRole("link", { name: "Resume learning" })
			.click();
		await expect(page).toHaveURL(
			/\/courses\/course-intro-cs\/learn\?blockId=block-video-1&positionSeconds=142/,
		);
		await expect(
			page.getByRole("region", { name: "Lesson content" }),
		).toBeVisible();
	});

	test("shows upcoming deadlines with Late allowed and navigates to the deadline block", async ({
		page,
	}) => {
		await page.goto("/dashboard");

		const comingUp = page.getByRole("region", { name: "Coming up" });
		await expect(comingUp.getByText("Late allowed")).toBeVisible();

		await comingUp
			.getByRole("link", { name: /System Call Knowledge Check/ })
			.click();
		await expect(page).toHaveURL(
			/\/courses\/course-intro-cs\/learn\?blockId=block-1-3/,
		);
		await expect(
			page
				.getByRole("region", { name: "Lesson content" })
				.getByRole("heading", { name: "System Call Knowledge Check" }),
		).toBeVisible();
	});

	test("renders empty state with catalog link when student has no enrollments", async ({
		page,
	}) => {
		await page.addInitScript(() => {
			Object.assign(window, {
				__nodusMockBypass: ["/api/users/me/enrollments"],
			});
		});
		await page.route("**/api/users/me/enrollments*", (route) =>
			route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({
					data: [],
					meta: {
						total: 0,
						page: 1,
						limit: 50,
						totalPages: 0,
						hasNextPage: false,
						hasPrevPage: false,
						hasPreviousPage: false,
					},
				}),
			}),
		);

		await page.goto("/dashboard");

		await expect(
			page.getByRole("heading", {
				name: "Your learning journey starts here.",
			}),
		).toBeVisible();
		const exploreLink = page.getByRole("link", { name: "Explore courses" });
		await expect(exploreLink).toBeVisible();
		await expect(exploreLink).toHaveAttribute("href", "/catalog");
	});

	test("fits a phone viewport without horizontal overflow", async ({
		page,
	}) => {
		await page.setViewportSize({ width: 390, height: 844 });
		await page.goto("/dashboard");

		const continueSection = page.getByRole("region", {
			name: "Continue learning",
		});
		await expect(
			continueSection.getByRole("link", { name: "Resume learning" }),
		).toBeVisible();
		const comingUp = page.getByRole("region", { name: "Coming up" });
		await expect(
			comingUp.getByRole("link", { name: /System Call Knowledge Check/ }),
		).toBeVisible();

		const overflow = await page.evaluate(
			() => document.documentElement.scrollWidth - window.innerWidth,
		);
		expect(overflow).toBeLessThanOrEqual(0);
	});
});
