import { expect, test } from "@playwright/test";

test.describe("Authentication and Session Lifecycle Flow", () => {
	test("protects workspace routes and redirects unauthenticated users to login", async ({
		page,
	}) => {
		await page.addInitScript(() => {
			localStorage.setItem("nodus_logout_tombstone", "true");
		});

		await page.goto("/workspace");

		await expect(page).toHaveURL(/\/login\?redirect=%2Fworkspace/);
		await expect(
			page.getByRole("heading", { name: "Welcome back" }),
		).toBeVisible();
		await expect(page.getByLabel("Email", { exact: true })).toBeVisible();
		await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
		await expect(page.getByRole("button", { name: "Log in" })).toBeVisible();
	});

	test("displays error banner when submitting invalid login credentials", async ({
		page,
	}) => {
		await page.addInitScript(() => {
			localStorage.setItem("nodus_logout_tombstone", "true");
		});

		await page.goto("/login");

		await page.getByLabel("Email", { exact: true }).fill("invalid@example.com");
		await page.getByLabel("Password", { exact: true }).fill("wrong-password");
		await page.getByRole("button", { name: "Log in" }).click();

		const alertBanner = page.getByRole("alert");
		await expect(alertBanner).toBeVisible();
		await expect(alertBanner).toContainText("Invalid email or password.");

		await expect(page).toHaveURL(/\/login/);
	});

	test("displays dedicated suspended account card on HTTP 403 response", async ({
		page,
	}) => {
		await page.addInitScript(() => {
			localStorage.setItem("nodus_logout_tombstone", "true");
		});

		await page.goto("/login");

		await page.getByLabel("Email", { exact: true }).fill("suspended@nodus.edu");
		await page.getByLabel("Password", { exact: true }).fill("anypassword123");
		await page.getByRole("button", { name: "Log in" }).click();

		await expect(
			page.getByText("Your account has been suspended by an administrator."),
		).toBeVisible();
		const catalogButton = page.getByRole("link", { name: "Return to catalog" });
		await expect(catalogButton).toBeVisible();
		await expect(catalogButton).toHaveAttribute("href", "/");
	});

	test("validates separate name fields, role selection, and 201 redirect during registration", async ({
		page,
	}) => {
		await page.addInitScript(() => {
			localStorage.setItem("nodus_logout_tombstone", "true");
		});

		await page.goto("/register");

		await expect(
			page.getByRole("heading", { name: "Create your account" }),
		).toBeVisible();

		const studentTab = page.getByRole("tab", { name: "Student" });
		const lecturerTab = page.getByRole("tab", { name: "Lecturer" });

		await expect(studentTab).toHaveAttribute("aria-selected", "true");
		await lecturerTab.click();
		await expect(lecturerTab).toHaveAttribute("aria-selected", "true");
		await studentTab.click();
		await expect(studentTab).toHaveAttribute("aria-selected", "true");

		await page.getByLabel("Last name", { exact: true }).fill("Doe");
		await page.getByLabel("Email", { exact: true }).fill("jane@example.com");
		await page.getByLabel("Password", { exact: true }).fill("philosophical123");
		await page.getByRole("button", { name: "Create account" }).click();

		await expect(page.getByText("First name is required.")).toBeVisible();
		await expect(page).toHaveURL(/\/register/);

		await page.getByLabel("First name", { exact: true }).fill("Jane");
		await page.getByRole("button", { name: "Create account" }).click();

		await expect(page).toHaveURL(
			/\/login\?email=jane%40example\.com&registered=true/,
		);
		await expect(
			page.getByText("Account created successfully. Please log in."),
		).toBeVisible();
		await expect(page.getByLabel("Email", { exact: true })).toHaveValue(
			"jane@example.com",
		);
	});

	test("logs in with valid credentials, honors deep-link redirect, and logs out cleanly", async ({
		page,
	}) => {
		await page.addInitScript(() => {
			localStorage.setItem("nodus_logout_tombstone", "true");
		});

		await page.goto("/workspace");
		await expect(page).toHaveURL(/\/login\?redirect=%2Fworkspace/);

		await page.getByLabel("Email", { exact: true }).fill("alex@example.com");
		await page.getByLabel("Password", { exact: true }).fill("password123");
		await page.getByRole("button", { name: "Log in" }).click();

		await expect(page).toHaveURL(/\/workspace/);

		const signOutButton = page.getByRole("button", { name: "Sign out" });
		await expect(signOutButton).toBeVisible();

		await signOutButton.click();

		await expect(page).toHaveURL(/\/login/);
		await expect(
			page.getByRole("heading", { name: "Welcome back" }),
		).toBeVisible();

		await page.goto("/workspace");
		await expect(page).toHaveURL(/\/login\?redirect=%2Fworkspace/);
	});
});
