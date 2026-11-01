import { expect, test } from "@playwright/test";

test.describe("Authentication and Session Lifecycle Flow", () => {
	test("protects workspace routes and redirects unauthenticated users to login", async ({
		page,
	}) => {
		// Ensure browser session starts in an explicit unauthenticated state
		await page.addInitScript(() => {
			localStorage.setItem("nodus_logout_tombstone", "true");
		});

		// Attempt to visit protected workspace route directly
		await page.goto("/workspace");

		// Router beforeLoad guard redirects to /login with redirect query param
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

		// Banner/Error surfaces HTTP 401 response
		const alertBanner = page.getByRole("alert");
		await expect(alertBanner).toBeVisible();
		await expect(alertBanner).toContainText("Invalid email or password.");

		// Stays on /login without navigating
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

		// Banner surfaces 403 suspended state with return to catalog button
		await expect(
			page.getByText("Your account has been suspended by an administrator."),
		).toBeVisible();
		const catalogButton = page.getByRole("link", { name: "Return to catalog" });
		await expect(catalogButton).toBeVisible();
		await expect(catalogButton).toHaveAttribute("href", "/");
	});

	test("validates full name partitioning, role selection, and 201 redirect during registration", async ({
		page,
	}) => {
		await page.addInitScript(() => {
			localStorage.setItem("nodus_logout_tombstone", "true");
		});

		await page.goto("/register");

		await expect(
			page.getByRole("heading", { name: "Create your account" }),
		).toBeVisible();

		// Test role toggle tabs
		const studentTab = page.getByRole("tab", { name: "Student" });
		const lecturerTab = page.getByRole("tab", { name: "Lecturer" });

		await expect(studentTab).toHaveAttribute("aria-selected", "true");
		await lecturerTab.click();
		await expect(lecturerTab).toHaveAttribute("aria-selected", "true");
		await studentTab.click();
		await expect(studentTab).toHaveAttribute("aria-selected", "true");

		// Test mononym rejection
		await page.getByLabel("Full name", { exact: true }).fill("Plato");
		await page.getByLabel("Email", { exact: true }).fill("plato@example.com");
		await page.getByLabel("Password", { exact: true }).fill("philosophical123");
		await page.getByRole("button", { name: "Create account" }).click();

		await expect(
			page.getByText("Please enter your full name (both first and last name)."),
		).toBeVisible();
		await expect(page).toHaveURL(/\/register/);

		// Enter valid multipart full name
		await page.getByLabel("Full name", { exact: true }).fill("Jane Doe");
		await page.getByRole("button", { name: "Create account" }).click();

		// Registration succeeds (201 Created) -> Redirects to /login with pre-filled email and registered=true
		await expect(page).toHaveURL(
			/\/login\?email=plato%40example\.com&registered=true/,
		);
		await expect(
			page.getByText("Account created successfully. Please log in."),
		).toBeVisible();
		await expect(page.getByLabel("Email", { exact: true })).toHaveValue(
			"plato@example.com",
		);
	});

	test("logs in with valid credentials, honors deep-link redirect, and logs out cleanly", async ({
		page,
	}) => {
		await page.addInitScript(() => {
			localStorage.setItem("nodus_logout_tombstone", "true");
		});

		// Start with an unauthenticated navigation to /workspace
		await page.goto("/workspace");
		await expect(page).toHaveURL(/\/login\?redirect=%2Fworkspace/);

		// Enter valid credentials
		await page.getByLabel("Email", { exact: true }).fill("alex@example.com");
		await page.getByLabel("Password", { exact: true }).fill("password123");
		await page.getByRole("button", { name: "Log in" }).click();

		// Upon successful authentication, redirected to original target (/workspace)
		await expect(page).toHaveURL(/\/workspace/);

		// Header displays authenticated sign out button
		const signOutButton = page.getByRole("button", { name: "Sign out" });
		await expect(signOutButton).toBeVisible();

		// Click sign out to terminate session
		await signOutButton.click();

		// After logout, router invalidation kicks user out of protected /workspace route to /login
		await expect(page).toHaveURL(/\/login/);
		await expect(
			page.getByRole("heading", { name: "Welcome back" }),
		).toBeVisible();

		// Attempting to visit /workspace again immediately bounces back to /login
		await page.goto("/workspace");
		await expect(page).toHaveURL(/\/login\?redirect=%2Fworkspace/);
	});
});
