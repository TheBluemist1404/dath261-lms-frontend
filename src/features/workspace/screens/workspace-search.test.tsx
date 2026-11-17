import {
	createMemoryHistory,
	createRouter,
	RouterProvider,
} from "@tanstack/react-router";
import { screen, waitFor, within } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { routeTree } from "@/routeTree.gen";
import { signInForTest } from "@/test/auth";
import { server } from "@/test/mocks/server";
import { createTestQueryClient, renderWithProviders } from "@/test/render";
import { workspaceHandlers } from "../testing/handlers";
import { mockUsers, resetMockDb } from "../testing/mock-db";

vi.mock("@tanstack/react-devtools", () => ({ TanStackDevtools: () => null }));

let signOut = () => {};

function renderAt(path: string, userId: string = mockUsers.alex.id) {
	signOut = signInForTest(userId);
	const router = createRouter({
		routeTree,
		history: createMemoryHistory({ initialEntries: [path] }),
		context: { queryClient: createTestQueryClient() },
	});
	return { router, ...renderWithProviders(<RouterProvider router={router} />) };
}

beforeEach(() => {
	resetMockDb();
	server.use(...workspaceHandlers);
});

afterEach(() => signOut());

describe("Workspace search", () => {
	it("finds titles and note text across accessible workspaces", async () => {
		renderAt("/workspace/search?q=process");

		const results = await screen.findByRole("region", { name: "3 results" });
		const links = within(results).getAllByRole("link");
		expect(links.map((link) => link.getAttribute("href"))).toEqual([
			"/workspace/ws-personal-alex/pages/page-processes",
			"/workspace/ws-systems-study-group/pages/page-group-processes",
			"/workspace/ws-research-journal/pages/page-sources",
		]);
		expect(links[0]).toHaveTextContent(
			"My personal workspace / Operating systems notes",
		);
		expect(links[0]).toHaveTextContent("A process is a program in execution.");
		expect(links[2]).toHaveTextContent(
			"Silberschatz chapter 3 covers process creation",
		);
	});

	it("never returns pages from workspaces the user is not in", async () => {
		renderAt("/workspace/search?q=process", mockUsers.bao.id);

		const results = await screen.findByRole("region", { name: "1 result" });
		expect(within(results).getByRole("link")).toHaveAttribute(
			"href",
			"/workspace/ws-systems-study-group/pages/page-group-processes",
		);
	});

	it("leaves archived workspaces out", async () => {
		renderAt("/workspace/search?q=archived");

		expect(
			await screen.findByRole("heading", { name: "No matching pages." }),
		).toBeInTheDocument();
	});

	it("updates the URL as the user types", async () => {
		const { router, user } = renderAt("/workspace/search");
		expect(
			await screen.findByText(/Type at least 2 characters/),
		).toBeInTheDocument();

		await user.type(screen.getByLabelText("Search pages"), "revisit");
		await waitFor(() =>
			expect(router.state.location.search).toEqual({ q: "revisit" }),
		);
		expect(
			await screen.findByRole("link", { name: /Questions to revisit/ }),
		).toBeInTheDocument();
	});

	it("offers a retry when search fails", async () => {
		let fail = true;
		server.use(
			http.get("*/api/search/pages", () =>
				fail
					? HttpResponse.json({ statusCode: 500 }, { status: 500 })
					: undefined,
			),
		);
		const { user } = renderAt("/workspace/search?q=process");

		expect(
			await screen.findByRole("heading", {
				name: "Search could not be completed.",
			}),
		).toBeInTheDocument();
		fail = false;
		await user.click(screen.getByRole("button", { name: "Retry" }));
		expect(
			await screen.findByRole("region", { name: "3 results" }),
		).toBeInTheDocument();
	});

	it("starts from the landing search box", async () => {
		const { router, user } = renderAt("/workspace");
		await user.type(
			await screen.findByRole("searchbox", { name: "Search pages" }),
			"plan{Enter}",
		);

		await waitFor(() =>
			expect(router.state.location.pathname).toBe("/workspace/search"),
		);
		expect(
			await screen.findByRole("link", { name: /Study plan/ }),
		).toBeInTheDocument();
	});
});
