import { expect, test } from "@playwright/test";
import { SEED, signIn } from "./support";

/**
 * E2E-07: each role lands on its own home, other roles' screens are closed to it, the
 * session survives a reload through the refresh cookie, and signing out ends it.
 */

const homes = [
	{ email: SEED.student, home: /\/dashboard$/, closed: "/admin" },
	{
		email: SEED.lecturer,
		home: /\/instructor\/courses$/,
		closed: "/dashboard",
	},
	{ email: SEED.admin, home: /\/admin$/, closed: "/instructor/courses" },
];

for (const { email, home, closed } of homes) {
	test(`${email} lands on its home and cannot open ${closed}`, async ({
		page,
	}) => {
		await signIn(page, email);
		await expect(page).toHaveURL(home);

		await page.goto(closed);
		await expect(page).not.toHaveURL(new RegExp(`${closed}$`));

		// The landing page sends a signed-in user home.
		await page.goto("/");
		await expect(page).toHaveURL(home);
	});
}

test("a signed-out visitor is sent to log in and back to where they were going", async ({
	page,
}) => {
	await page.goto("/my-courses");
	await expect(page).toHaveURL(/\/login\?redirect=%2Fmy-courses/);
	await page.getByLabel("Email", { exact: true }).fill(SEED.student);
	await page.getByLabel("Password", { exact: true }).fill("password123");
	await page.getByRole("button", { name: "Log in" }).click();
	await expect(page).toHaveURL(/\/my-courses/);
});

test("the session survives a reload and ends on sign out", async ({ page }) => {
	await signIn(page, SEED.student);
	await page.goto("/my-courses");
	await page.reload();
	await expect(page).toHaveURL(/\/my-courses/);
	await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();

	await page.getByRole("button", { name: "Sign out" }).click();
	await expect(page).toHaveURL(/\/login/);

	await page.goto("/my-courses");
	await expect(page).toHaveURL(/\/login\?redirect=%2Fmy-courses/);
	await page.reload();
	await expect(page).toHaveURL(/\/login/);
});
