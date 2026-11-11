import {
	createMemoryHistory,
	createRouter,
	RouterProvider,
} from "@tanstack/react-router";
import { screen, within } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { routeTree } from "@/routeTree.gen";
import { signInForTest } from "@/test/auth";
import { server } from "@/test/mocks/server";
import { createTestQueryClient, renderWithProviders } from "@/test/render";
import { workspaceHandlers } from "../testing/handlers";
import { mockDb, mockUsers, resetMockDb } from "../testing/mock-db";

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

function workspaceRecord(id: string) {
	const record = mockDb.workspaces.find((workspace) => workspace.id === id);
	if (!record) throw new Error(`No mock workspace ${id}`);
	return record;
}

beforeEach(() => {
	resetMockDb();
	server.use(...workspaceHandlers);
});

afterEach(() => signOut());

describe("Workspace settings", () => {
	it("lets an Owner rename the workspace", async () => {
		const { user } = renderAt("/workspace/ws-research-journal/settings");
		const input = await screen.findByRole("textbox", {
			name: "Workspace name",
		});
		const save = screen.getByRole("button", { name: "Save name" });
		expect(save).toBeDisabled();

		await user.clear(input);
		await user.type(input, "Thesis research");
		await user.click(save);

		expect(await screen.findByText("Name saved.")).toBeInTheDocument();
		expect(workspaceRecord("ws-research-journal").name).toBe("Thesis research");
		expect(
			screen.getByRole("link", { name: "← Thesis research" }),
		).toBeInTheDocument();
	});

	it("archives after confirmation and then offers restore", async () => {
		const { user } = renderAt("/workspace/ws-systems-study-group/settings");
		await user.click(
			await screen.findByRole("button", { name: "Archive workspace" }),
		);

		const dialog = within(
			screen.getByRole("dialog", { name: "Archive Systems study group?" }),
		);
		await user.click(dialog.getByRole("button", { name: "Archive workspace" }));

		expect(await screen.findByText("Workspace archived")).toBeInTheDocument();
		expect(
			screen.getByRole("textbox", { name: "Workspace name" }),
		).toHaveAttribute("readonly");
		expect(workspaceRecord("ws-systems-study-group").archivedAt).not.toBeNull();

		await user.click(screen.getByRole("button", { name: "Restore workspace" }));
		expect(
			await screen.findByRole("button", { name: "Archive workspace" }),
		).toBeInTheDocument();
		expect(workspaceRecord("ws-systems-study-group").archivedAt).toBeNull();
	});

	it("shows a Co-owner a read-only view without archive controls", async () => {
		renderAt("/workspace/ws-systems-study-group/settings", mockUsers.mai.id);

		expect(
			await screen.findByText("Systems study group · Co-owner view"),
		).toBeInTheDocument();
		expect(
			screen.getByRole("textbox", { name: "Workspace name" }),
		).toHaveAttribute("readonly");
		expect(screen.queryByRole("button", { name: "Save name" })).toBeNull();
		expect(
			screen.queryByRole("button", { name: "Archive workspace" }),
		).toBeNull();
	});

	it("never offers archive for the personal workspace", async () => {
		renderAt("/workspace/ws-personal-alex/settings");

		expect(
			await screen.findByText(/Default personal workspace · Private/),
		).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "Archive workspace" }),
		).toBeNull();
	});

	it("treats a workspace the user cannot access as not found", async () => {
		renderAt("/workspace/ws-personal-alex/settings", mockUsers.bao.id);

		expect(
			await screen.findByRole("heading", { name: "Workspace not found" }),
		).toBeInTheDocument();
	});
});

describe("Archived workspaces", () => {
	it("lists archived workspaces and restores one to the active list", async () => {
		const { user } = renderAt("/workspace/archived");
		await user.click(
			await screen.findByRole("button", { name: "Restore Old project notes" }),
		);

		expect(
			await screen.findByText("No archived workspaces."),
		).toBeInTheDocument();
		await user.click(screen.getByRole("link", { name: "← All workspaces" }));
		expect(
			await screen.findByRole("link", { name: /^Old project notes/ }),
		).toBeInTheDocument();
	});

	it("tells non-Owners who can restore", async () => {
		workspaceRecord("ws-systems-study-group").archivedAt =
			"2026-10-21T00:00:00.000Z";
		renderAt("/workspace/archived", mockUsers.bao.id);

		expect(await screen.findByText("Owner can restore")).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: /Restore/ })).toBeNull();
	});
});

describe("Workspace landing errors", () => {
	it("offers a retry when the list fails to load", async () => {
		let fail = true;
		server.use(
			http.get("*/api/workspaces", () =>
				fail
					? HttpResponse.json(
							{ statusCode: 500, message: "Database unavailable" },
							{ status: 500 },
						)
					: undefined,
			),
		);
		const { user } = renderAt("/workspace");

		const alert = await screen.findByRole("alert");
		expect(alert).toHaveTextContent("Database unavailable");
		fail = false;
		await user.click(within(alert).getByRole("button", { name: "Try again" }));
		expect(
			await screen.findByRole("link", { name: /^Research journal/ }),
		).toBeInTheDocument();
	});
});
