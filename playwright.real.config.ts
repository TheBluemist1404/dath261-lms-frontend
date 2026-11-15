import { defineConfig, devices } from "@playwright/test";

const port = 4174;

/**
 * Browser tests against the real backend (E2E-02 and later E2E-01). Nothing is
 * mocked: start the backend first (default http://localhost:3001, override with
 * VITE_API_PROXY_TARGET) on a database seeded with `pnpm db:seed:dev`. The dev
 * server proxies /api, including the /api/collab WebSocket, to it.
 */
export default defineConfig({
	testDir: "./e2e/real",
	// Each test signs in several seeded users and shares backend state.
	fullyParallel: false,
	workers: 1,
	forbidOnly: Boolean(process.env.CI),
	retries: 0,
	timeout: 90_000,
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
		env: { VITE_API_MOCKING: "false" },
	},
});
