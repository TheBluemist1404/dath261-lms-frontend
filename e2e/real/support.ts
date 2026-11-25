import {
	type APIRequestContext,
	type Browser,
	expect,
	type Page,
} from "@playwright/test";

/**
 * Shared helpers for the real-backend browser tests. They use the accounts from the
 * backend's `pnpm db:seed:dev` (password `password123`), or register fresh users so a
 * test that changes state never depends on what an earlier run left behind.
 */

export const PASSWORD = "password123";
export const SEED = {
	student: "student@dath261.dev",
	classmate: "classmate@dath261.dev",
	lecturer: "lecturer@dath261.dev",
	admin: "admin@dath261.dev",
} as const;

export const SEED_IDS = {
	algorithms: "seed-course-algorithms",
	databases: "seed-course-databases",
	workspace: "seed-workspace-study",
	graphsPage: "seed-page-graphs",
	lecture: "seed-block-lecture",
} as const;

/** A unique suffix per run, so names and emails never collide with earlier runs. */
export function runId() {
	return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/** Signs in through the login form and waits until the app has left /login. */
export async function signIn(page: Page, email: string, password = PASSWORD) {
	await page.goto("/login");
	await page.getByLabel("Email", { exact: true }).fill(email);
	await page.getByLabel("Password", { exact: true }).fill(password);
	await page.getByRole("button", { name: "Log in" }).click();
	await expect(page).not.toHaveURL(/\/login/);
}

/** Opens a fresh browser context signed in as `email`. */
export async function signInNewContext(browser: Browser, email: string) {
	const context = await browser.newContext();
	const page = await context.newPage();
	await signIn(page, email);
	return { context, page };
}

/** Registers an account through the API and returns its email. */
export async function registerAccount(
	request: APIRequestContext,
	role: "STUDENT" | "LECTURER",
	firstName = "E2E",
) {
	const email = `e2e-${role.toLowerCase()}-${runId()}@example.com`;
	const response = await request.post("/api/auth/register", {
		data: {
			email,
			password: PASSWORD,
			role,
			firstName,
			lastName: role === "STUDENT" ? "Student" : "Lecturer",
		},
	});
	expect(response.status(), await response.text()).toBe(201);
	return email;
}

/** Logs in through the API and returns a bearer header for direct API calls. */
export async function apiAuth(request: APIRequestContext, email: string) {
	const response = await request.post("/api/auth/login", {
		data: { email, password: PASSWORD },
	});
	expect(response.ok(), await response.text()).toBe(true);
	const { accessToken } = (await response.json()) as { accessToken: string };
	return { Authorization: `Bearer ${accessToken}` };
}
