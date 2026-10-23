import { afterEach, describe, expect, it } from "vitest";
import middleware, { backendTarget, config } from "./middleware";

describe("API proxy middleware", () => {
	const original = process.env.BACKEND_URL;
	afterEach(() => {
		process.env.BACKEND_URL = original;
	});

	it("only runs for /api paths", () => {
		expect(config.matcher).toBe("/api/:path*");
	});

	it("keeps the path and query and swaps in the backend origin", () => {
		expect(
			backendTarget(
				"https://app.example.com/api/search/pages?q=graph",
				"https://backend.example.com",
			),
		).toBe("https://backend.example.com/api/search/pages?q=graph");
	});

	it("ignores any path or trailing slash on BACKEND_URL", () => {
		expect(
			backendTarget(
				"https://app.example.com/api/auth/refresh",
				"https://backend.example.com/extra/",
			),
		).toBe("https://backend.example.com/api/auth/refresh");
	});

	it("cannot be steered to another host by the request path", () => {
		expect(
			backendTarget(
				"https://app.example.com/api//evil.example.com/x",
				"https://backend.example.com",
			),
		).toBe("https://backend.example.com/api//evil.example.com/x");
	});

	it("rewrites to the backend through the Vercel rewrite header", () => {
		process.env.BACKEND_URL = "https://backend.example.com";
		const response = middleware(
			new Request("https://app.example.com/api/workspaces?archived=true"),
		);
		expect(response.headers.get("x-middleware-rewrite")).toBe(
			"https://backend.example.com/api/workspaces?archived=true",
		);
	});

	it("fails loudly when BACKEND_URL is missing", async () => {
		delete process.env.BACKEND_URL;
		const response = middleware(
			new Request("https://app.example.com/api/workspaces"),
		);
		expect(response.status).toBe(500);
		expect(await response.text()).toBe("BACKEND_URL is not configured");
	});
});
