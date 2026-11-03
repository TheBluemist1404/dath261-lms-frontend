import { QueryClientProvider } from "@tanstack/react-query";
import {
	createMemoryHistory,
	createRouter,
	RouterProvider,
} from "@tanstack/react-router";
import { render, screen, waitFor, within } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockPublishedCourses } from "@/features/courses/testing/handlers";
import { routeTree } from "@/routeTree.gen";
import { type UserRole, useAuthStore } from "@/stores/auth.store";
import { server } from "@/test/mocks/server";
import { createTestQueryClient } from "@/test/render";

// The root route mounts dev-only devtools, which cannot run under jsdom.
vi.mock("@tanstack/react-devtools", () => ({ TanStackDevtools: () => null }));

const catalogUrl = "*/api/courses/published";

function renderAt(path: string) {
	const queryClient = createTestQueryClient();
	const router = createRouter({
		routeTree,
		context: { queryClient },
		history: createMemoryHistory({ initialEntries: [path] }),
	});

	render(
		<QueryClientProvider client={queryClient}>
			<RouterProvider router={router} />
		</QueryClientProvider>,
	);
	return router;
}

async function findLanding() {
	return screen.findByRole("heading", {
		level: 1,
		name: "Build knowledge that stays with you.",
	});
}

describe("landing page", () => {
	beforeEach(() => {
		useAuthStore.getState().setUser(null);
	});

	it("pitches the product to signed-out visitors with register and log in", async () => {
		server.use(http.get(catalogUrl, () => HttpResponse.json([])));
		renderAt("/");

		const hero = (await findLanding()).closest("section");
		if (!hero) throw new Error("hero section missing");
		expect(
			within(hero).getByRole("link", { name: "Get started" }),
		).toHaveAttribute("href", "/register");
		expect(within(hero).getByRole("link", { name: "Log in" })).toHaveAttribute(
			"href",
			"/login",
		);

		for (const feature of [
			"Guided courses",
			"A workspace that is yours",
			"Study together, live",
		]) {
			expect(
				screen.getByRole("heading", { level: 3, name: feature }),
			).toBeInTheDocument();
		}
		// The shared shell's header stays in place.
		expect(screen.getByRole("link", { name: "Nodus home" })).toBeVisible();
	});

	it("previews the first three published courses and links them to the catalog", async () => {
		server.use(
			http.get(catalogUrl, () => HttpResponse.json(mockPublishedCourses)),
		);
		renderAt("/");

		const heading = await screen.findByRole("heading", {
			name: "Explore courses",
		});
		const section = heading.closest("section");
		if (!section) throw new Error("preview section missing");
		const cards = within(section).getAllByRole("listitem");
		expect(cards).toHaveLength(3);
		expect(within(cards[0]).getByText("Operating Systems")).toBeVisible();
		expect(
			within(section).queryByText("Computer Networks"),
		).not.toBeInTheDocument();
		for (const link of within(section).getAllByRole("link")) {
			expect(link).toHaveAttribute("href", "/catalog");
		}
	});

	it.each([
		[
			"the catalog API is missing",
			() => new HttpResponse(null, { status: 404 }),
		],
		["guests are refused", () => new HttpResponse(null, { status: 401 })],
		["no course is published", () => HttpResponse.json([])],
	])("hides the course preview when %s", async (_case, respond) => {
		let calls = 0;
		server.use(
			http.get(catalogUrl, () => {
				calls += 1;
				return respond();
			}),
		);
		renderAt("/");

		await findLanding();
		await waitFor(() => expect(calls).toBe(1));
		// Let the failed query settle before asserting the section is absent.
		await new Promise((resolve) => setTimeout(resolve, 20));
		expect(
			screen.queryByRole("heading", { name: "Explore courses" }),
		).not.toBeInTheDocument();
		expect(calls).toBe(1);
	});

	it.each([
		["student", "/workspace"],
		["lecturer", "/instructor/courses"],
		["admin", "/admin"],
	] as const)("sends a signed-in %s to %s", async (role: UserRole, home) => {
		server.use(http.get("*", () => HttpResponse.json([])));
		useAuthStore.getState().setUser({
			id: `${role}-1`,
			name: `Test ${role}`,
			email: `${role}@example.com`,
			role,
		});
		const router = renderAt("/");

		await waitFor(() => expect(router.state.location.pathname).toBe(home));
		expect(
			screen.queryByRole("heading", {
				name: "Build knowledge that stays with you.",
			}),
		).not.toBeInTheDocument();
	});
});
