import { expect, type Page, test } from "@playwright/test";

const heroName = "Build knowledge that stays with you.";

async function visitSignedOut(page: Page) {
	await page.addInitScript(() => {
		localStorage.setItem("nodus_logout_tombstone", "true");
	});
	await page.goto("/");
	await expect(
		page.getByRole("heading", { level: 1, name: heroName }),
	).toBeVisible();
}

test.describe("Public landing page", () => {
	test("shows signed-out visitors the pitch, features and course preview", async ({
		page,
	}) => {
		await visitSignedOut(page);

		await expect(page).toHaveURL(/\/$/);
		for (const feature of [
			"Guided courses",
			"A workspace that is yours",
			"Study together, live",
		]) {
			await expect(
				page.getByRole("heading", { level: 3, name: feature }),
			).toBeVisible();
		}

		const preview = page.getByRole("region", { name: "Explore courses" });
		await expect(preview.getByRole("listitem")).toHaveCount(3);
		await expect(preview.getByText("Operating Systems")).toBeVisible();
		await expect(page.locator('a[href="/catalog"]')).toHaveCount(0);
		await expect(
			page.getByRole("navigation", { name: "Primary navigation" }),
		).toHaveCount(0);
	});

	test("leads to registration and login", async ({ page }) => {
		await visitSignedOut(page);
		const hero = page.getByRole("region", { name: heroName });

		await hero.getByRole("link", { name: "Get started" }).click();
		await expect(page).toHaveURL(/\/register$/);

		await page.goBack();
		await hero.getByRole("link", { name: "Log in" }).click();
		await expect(page).toHaveURL(/\/login$/);
		await expect(
			page.getByRole("heading", { name: "Welcome back" }),
		).toBeVisible();
	});

	test("fits a phone screen without sideways scrolling", async ({ page }) => {
		await page.setViewportSize({ width: 375, height: 812 });
		await visitSignedOut(page);

		const overflow = await page.evaluate(
			() => document.documentElement.scrollWidth - window.innerWidth,
		);
		expect(overflow).toBeLessThanOrEqual(0);
		const hero = page.getByRole("region", { name: heroName });
		await expect(
			hero.getByRole("link", { name: "Get started" }),
		).toBeInViewport();
		await expect(hero.getByRole("link", { name: "Log in" })).toBeInViewport();
	});

	test("sends a signed-in student to their workspaces", async ({ page }) => {
		// Without the logout tombstone the mocked refresh signs in Alex (student).
		await page.goto("/");
		await expect(page).toHaveURL(/\/workspace/);
		await expect(
			page.getByRole("heading", { level: 1, name: heroName }),
		).toHaveCount(0);
	});
});
