import { defineConfig, devices } from "@playwright/test";

const port = 4173;

/**
 * Browser tests for the real editor, which jsdom cannot drive. They run the
 * dev server with the API mocked in the page, so no backend is needed; the
 * signed-in user is the mock student (Alex).
 */
export default defineConfig({
	testDir: "./e2e",
	fullyParallel: true,
	forbidOnly: Boolean(process.env.CI),
	retries: process.env.CI ? 1 : 0,
	reporter: process.env.CI ? [["github"], ["list"]] : "list",
	use: {
		baseURL: `http://localhost:${port}`,
		trace: "retain-on-failure",
	},
	projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
	webServer: {
		command: `pnpm exec vite --port ${port} --strictPort`,
		url: `http://localhost:${port}`,
		reuseExistingServer: !process.env.CI,
		env: { VITE_API_MOCKING: "true" },
	},
});
