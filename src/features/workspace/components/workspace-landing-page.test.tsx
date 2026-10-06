import {
	createMemoryHistory,
	createRouter,
	RouterProvider,
} from "@tanstack/react-router";
import { screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { routeTree } from "@/routeTree.gen";
import { useAuthStore } from "@/stores/auth.store";
import { createTestQueryClient, renderWithProviders } from "@/test/render";

vi.mock("@tanstack/react-devtools", () => ({ TanStackDevtools: () => null }));

function createWorkspaceRouter(path: string) {
	return createRouter({
		routeTree,
		history: createMemoryHistory({ initialEntries: [path] }),
		context: { queryClient: createTestQueryClient() },
	});
}

afterEach(() => {
	useAuthStore.getState().reset();
	localStorage.removeItem("tanstack_devtools_settings");
});

describe("Workspace routing", () => {
	it("repairs saved Devtools positioning while preserving other preferences", async () => {
		localStorage.setItem(
			"tanstack_devtools_settings",
			JSON.stringify({
				triggerMode: "floating",
				position: "bottom-left",
				triggerCoords: { x: 300, y: 400 },
				theme: "dark",
				hideUntilHover: true,
			}),
		);
		const router = createWorkspaceRouter("/workspace");
		renderWithProviders(<RouterProvider router={router} />);
		await screen.findByRole("heading", { name: "Workspaces", level: 1 });
		expect(
			JSON.parse(localStorage.getItem("tanstack_devtools_settings") ?? "{}"),
		).toEqual({
			triggerMode: "fixed",
			position: "bottom-right",
			theme: "dark",
			hideUntilHover: true,
		});
	});

	it.each([
		["/workspace", "/_layout/workspace/"],
		["/workspace/me", "/_layout/workspace/me"],
		["/workspace/study-group", "/_layout/workspace/$id"],
	])("places %s under the future auth boundary", async (path, leafRoute) => {
		const router = createWorkspaceRouter(path);
		await router.load();

		expect(router.state.matches.map((match) => match.routeId)).toEqual([
			"__root__",
			"/_layout",
			"/_layout/workspace",
			leafRoute,
		]);
		expect(useAuthStore.getState().status).toBe("loading");
		expect(useAuthStore.getState().user).toBeNull();
	});

	it("opens the personal workspace and keeps workspace navigation active", async () => {
		useAuthStore.getState().setUser({
			id: "student-1",
			name: "Test Student",
			email: "student@example.com",
			role: "student",
		});
		const router = createWorkspaceRouter("/workspace");
		const { user } = renderWithProviders(<RouterProvider router={router} />);

		const personalLink = await screen.findByRole("link", {
			name: "Open my workspace",
		});
		expect(personalLink).toHaveAttribute("href", "/workspace/me");
		const workspaceLink = screen.getByRole("link", { name: "Workspaces" });
		expect(workspaceLink).toHaveAttribute("href", "/workspace");
		expect(workspaceLink).toHaveAttribute("aria-current", "page");
		expect(screen.getByRole("link", { name: "Dashboard" })).not.toHaveAttribute(
			"aria-current",
		);

		await user.click(personalLink);
		await waitFor(() => {
			expect(router.state.location.pathname).toBe("/workspace/me");
			expect(workspaceLink).toHaveAttribute("aria-current", "page");
		});
	});

	it("links a recently used page to its personal workspace and page identifier", async () => {
		const router = createWorkspaceRouter("/workspace");
		const { user } = renderWithProviders(<RouterProvider router={router} />);
		const pageLink = await screen.findByRole("link", {
			name: "Understanding processes",
		});
		expect(pageLink).toHaveAttribute(
			"href",
			"/workspace/me#understanding-processes",
		);

		await user.click(pageLink);
		await waitFor(() => {
			expect(router.state.location.pathname).toBe("/workspace/me");
			expect(router.state.location.hash).toBe("understanding-processes");
		});
	});

	it("creates the first additional workspace from the empty state", async () => {
		const router = createWorkspaceRouter("/workspace?preview=empty");
		const { user } = renderWithProviders(<RouterProvider router={router} />);
		const createButton = await screen.findByRole("button", {
			name: "Create workspace",
		});
		expect(
			screen.getByRole("heading", { name: "No additional workspaces yet" }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: "Open my workspace" }),
		).toBeInTheDocument();
		expect(screen.queryByRole("link", { name: /Research journal/ })).toBeNull();
		const dialog = screen.getByRole("dialog", { hidden: true });
		// jsdom does not implement the native dialog open/close methods.
		Object.defineProperties(dialog, {
			showModal: { value: () => dialog.setAttribute("open", "") },
			close: {
				value: () => {
					dialog.removeAttribute("open");
					dialog.dispatchEvent(new Event("close"));
				},
			},
		});

		await user.click(createButton);
		const form = within(
			screen.getByRole("dialog", { name: "Create a workspace" }),
		);
		const input = form.getByRole("textbox", { name: "Workspace name" });
		await user.type(input, "Discarded workspace");
		await user.click(form.getByRole("button", { name: "Cancel" }));
		expect(
			screen.queryByRole("link", { name: /Discarded workspace/ }),
		).toBeNull();

		await user.click(createButton);
		expect(input).toHaveValue("");
		await user.type(input, "   ");
		const submit = form.getByRole("button", { name: "Create workspace" });
		expect(submit).toBeDisabled();
		await user.clear(input);
		await user.type(input, "  Operating systems  ");
		await user.click(submit);

		const card = await screen.findByRole("link", { name: /Operating systems/ });
		expect(within(card).getByRole("heading")).toHaveTextContent(
			/^Operating systems$/,
		);
		expect(within(card).getByText("0 pages")).toBeInTheDocument();
		expect(within(card).getByText("Only you")).toBeInTheDocument();
		expect(card.getAttribute("href")).toMatch(/^\/workspace\/[^/]+$/);
		expect(
			screen.queryByRole("heading", { name: "No additional workspaces yet" }),
		).toBeNull();
		expect(screen.queryByRole("dialog")).toBeNull();
	});

	it.each([
		"/does-not-exist",
		"/workspace/me/does-not-exist",
	])("shows Not Found for %s and returns an admin home", async (path) => {
		useAuthStore.getState().setUser({
			id: "admin-1",
			name: "Test Admin",
			email: "admin@example.com",
			role: "admin",
		});
		const router = createWorkspaceRouter(path);
		const { user } = renderWithProviders(<RouterProvider router={router} />);
		expect(
			await screen.findByRole("heading", { name: "Page not found" }),
		).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Back to home" })).toHaveAttribute(
			"href",
			"/",
		);
		expect(screen.queryByRole("link", { name: "Go to workspaces" })).toBeNull();
		await user.click(screen.getByRole("link", { name: "Back to home" }));
		expect(
			await screen.findByRole("heading", {
				name: "Learner-Oriented LMS",
				level: 1,
			}),
		).toBeInTheDocument();
		expect(router.state.location.pathname).toBe("/");
	});
});
