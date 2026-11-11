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

function pageRecord(id: string) {
	const record = mockDb.pages.find((page) => page.id === id);
	if (!record) throw new Error(`No mock page ${id}`);
	return record;
}

const personalPage = (pageId: string) =>
	`/workspace/ws-personal-alex/pages/${pageId}`;

beforeEach(() => {
	resetMockDb();
	server.use(...workspaceHandlers);
});

afterEach(() => signOut());

describe("Workspace pages", () => {
	it("opens the first root page and shows the nested page tree", async () => {
		const { router } = renderAt("/workspace/ws-personal-alex");

		expect(
			await screen.findByRole("heading", {
				name: "Operating systems notes",
				level: 2,
			}),
		).toBeInTheDocument();
		expect(router.state.location.pathname).toBe(personalPage("page-os-notes"));

		const tree = screen.getByRole("navigation", { name: "Pages" });
		const current = within(tree).getByRole("link", {
			name: "Operating systems notes",
		});
		expect(current).toHaveAttribute("aria-current", "page");
		const nested = current.parentElement?.querySelector("ul");
		expect(
			nested &&
				within(nested)
					.getAllByRole("link")
					.map((link) => link.textContent),
		).toEqual(["Understanding processes", "Scheduling examples"]);
	});

	it("creates the first page from an empty workspace", async () => {
		mockDb.pages = mockDb.pages.filter(
			(page) => page.workspaceId !== "ws-research-journal",
		);
		const { user, router } = renderAt("/workspace/ws-research-journal");

		await user.click(
			await screen.findByRole("button", { name: "Create page" }),
		);
		const dialog = within(
			screen.getByRole("dialog", { name: "Create a page" }),
		);
		await user.type(
			dialog.getByRole("textbox", { name: "Page title" }),
			"Sources",
		);
		await user.click(dialog.getByRole("button", { name: "Create page" }));

		expect(
			await screen.findByRole("heading", { name: "Sources", level: 2 }),
		).toBeInTheDocument();
		expect(router.state.location.pathname).toMatch(
			/^\/workspace\/ws-research-journal\/pages\/page-/,
		);
	});

	it("creates a subpage under the current page", async () => {
		const { user } = renderAt(personalPage("page-processes"));

		await user.click(
			await screen.findByRole("button", { name: "New subpage" }),
		);
		const dialog = within(
			screen.getByRole("dialog", { name: "Create a page" }),
		);
		expect(dialog.getByRole("combobox", { name: "Parent page" })).toHaveValue(
			"page-processes",
		);
		await user.type(
			dialog.getByRole("textbox", { name: "Page title" }),
			"Deadlocks",
		);
		await user.click(dialog.getByRole("button", { name: "Create page" }));

		expect(
			await screen.findByRole("heading", { name: "Deadlocks", level: 2 }),
		).toBeInTheDocument();
		expect(
			screen.getByText("Operating systems notes / Understanding processes"),
		).toBeInTheDocument();
	});

	it("renames a page in the header and the tree", async () => {
		const { user } = renderAt(personalPage("page-revisit"));

		await user.click(await screen.findByRole("button", { name: "Rename" }));
		const dialog = within(screen.getByRole("dialog", { name: "Rename page" }));
		const input = dialog.getByRole("textbox", { name: "Page title" });
		await user.clear(input);
		await user.type(input, "Exam questions");
		await user.click(dialog.getByRole("button", { name: "Rename page" }));

		expect(
			await screen.findByRole("heading", { name: "Exam questions", level: 2 }),
		).toBeInTheDocument();
		expect(
			within(screen.getByRole("navigation", { name: "Pages" })).getByRole(
				"link",
				{
					name: "Exam questions",
				},
			),
		).toBeInTheDocument();
	});

	it("moves a page and never offers its own subtree as a destination", async () => {
		const { user } = renderAt(personalPage("page-os-notes"));

		await user.click(await screen.findByRole("button", { name: "Move" }));
		let dialog = within(screen.getByRole("dialog", { name: "Move this page" }));
		const options = dialog
			.getAllByRole("option")
			.map((option) => option.textContent?.trim());
		expect(options).toEqual(["Workspace root", "Questions to revisit"]);
		await user.click(dialog.getByRole("button", { name: "Cancel" }));

		await user.click(
			within(screen.getByRole("navigation", { name: "Pages" })).getByRole(
				"link",
				{
					name: "Scheduling examples",
				},
			),
		);
		await user.click(await screen.findByRole("button", { name: "Move" }));
		dialog = within(screen.getByRole("dialog", { name: "Move this page" }));
		await user.selectOptions(
			dialog.getByRole("combobox", { name: "Destination page" }),
			"page-revisit",
		);
		await user.click(dialog.getByRole("button", { name: "Move page" }));

		expect(
			await screen.findByText("Questions to revisit", { selector: "p" }),
		).toBeInTheDocument();
		await waitFor(() =>
			expect(pageRecord("page-scheduling").parentPageId).toBe("page-revisit"),
		);
	});

	it("autosaves edits through the editor slot", async () => {
		const { user } = renderAt(personalPage("page-revisit"));

		const editor = await screen.findByRole("textbox", { name: "Page content" });
		await user.type(editor, "Why does round-robin need a quantum?");
		expect(screen.getByText("Changes will save shortly")).toBeInTheDocument();

		await waitFor(
			() => expect(screen.getByText("All changes saved")).toBeInTheDocument(),
			{
				timeout: 3000,
			},
		);
		expect(pageRecord("page-revisit").content).toEqual({
			type: "plain-text",
			text: "Why does round-robin need a quantum?",
		});
	});

	it("keeps edits after a failed save and retries", async () => {
		let failures = 1;
		server.use(
			http.patch("*/api/pages/:pageId", () => {
				if (failures-- > 0) {
					return HttpResponse.json(
						{ statusCode: 500, message: "Database unavailable" },
						{ status: 500 },
					);
				}
				return undefined;
			}),
		);
		const { user } = renderAt(personalPage("page-revisit"));

		const editor = await screen.findByRole("textbox", { name: "Page content" });
		await user.type(editor, "Draft");
		const alert = await screen.findByRole("alert", {}, { timeout: 3000 });
		expect(alert).toHaveTextContent("Changes could not be saved");
		expect(editor).toHaveValue("Draft");

		await user.click(
			within(alert).getByRole("button", { name: "Retry saving" }),
		);
		expect(await screen.findByText("All changes saved")).toBeInTheDocument();
		expect(pageRecord("page-revisit").content).toEqual({
			type: "plain-text",
			text: "Draft",
		});
	});

	it("makes pages in an archived workspace read-only", async () => {
		renderAt("/workspace/ws-old-project/pages/page-old");

		expect(await screen.findByText("Workspace archived")).toBeInTheDocument();
		expect(
			await screen.findByRole("textbox", { name: "Page content" }),
		).toHaveAttribute("readonly");
		expect(screen.queryByRole("button", { name: "Rename" })).toBeNull();
		expect(screen.queryByRole("button", { name: "New page" })).toBeNull();
	});

	it("archives a page with its subpages and restores it from the archive", async () => {
		const { user } = renderAt(personalPage("page-os-notes"));

		await user.click(await screen.findByRole("button", { name: "Archive" }));
		const dialog = await screen.findByRole("dialog", {
			name: "Archive this page?",
		});
		await user.click(
			within(dialog).getByRole("button", { name: "Archive page" }),
		);

		// The page stays open, read-only, and leaves the tree with its subpages.
		expect(await screen.findByText("Page archived")).toBeInTheDocument();
		await waitFor(() =>
			expect(
				screen.queryByRole("link", { name: "Understanding processes" }),
			).not.toBeInTheDocument(),
		);
		expect(pageRecord("page-os-notes").archivedAt).not.toBeNull();
		expect(pageRecord("page-processes").archivedAt).toBe(
			pageRecord("page-os-notes").archivedAt,
		);
		expect(
			screen.queryByRole("button", { name: "Rename" }),
		).not.toBeInTheDocument();
		expect(
			screen.getByRole("textbox", { name: "Page content" }),
		).toHaveAttribute("readonly");

		await user.click(screen.getByRole("link", { name: "Archived pages" }));
		const archive = await screen.findByRole("region", {
			name: "Archived pages",
		});
		expect(
			await within(archive).findAllByText(
				"Archived with Operating systems notes",
				{
					exact: false,
				},
			),
		).toHaveLength(2);
		await user.click(
			within(archive).getByRole("button", {
				name: "Restore Operating systems notes",
			}),
		);
		const restore = await screen.findByRole("dialog", {
			name: "Restore this page?",
		});
		await user.click(
			within(restore).getByRole("button", { name: "Restore page" }),
		);

		expect(
			await within(archive).findByText("No archived pages."),
		).toBeInTheDocument();
		expect(pageRecord("page-processes").archivedAt).toBeNull();
		expect(
			await screen.findByRole("link", { name: "Understanding processes" }),
		).toBeInTheDocument();
	});
});
