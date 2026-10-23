import {
	createMemoryHistory,
	createRouter,
	RouterProvider,
} from "@tanstack/react-router";
import { screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { routeTree } from "@/routeTree.gen";
import { signInForTest } from "@/test/auth";
import { server } from "@/test/mocks/server";
import { createTestQueryClient, renderWithProviders } from "@/test/render";
import { workspaceHandlers } from "../testing/handlers";
import { mockDb, mockUsers, resetMockDb } from "../testing/mock-db";

vi.mock("@tanstack/react-devtools", () => ({ TanStackDevtools: () => null }));

const studyGroup = "/workspace/ws-systems-study-group/members";
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

function memberIds(workspaceId: string) {
	return mockDb.memberships
		.filter((membership) => membership.workspaceId === workspaceId)
		.map((membership) => membership.userId);
}

beforeEach(() => {
	resetMockDb();
	server.use(...workspaceHandlers);
});

afterEach(() => signOut());

describe("Workspace members", () => {
	it("lists members by role with their permissions", async () => {
		renderAt(studyGroup);
		const list = await screen.findByRole("list", { name: "Workspace members" });
		const rows = within(list).getAllByRole("listitem");

		expect(rows.map((row) => row.textContent)).toEqual([
			expect.stringContaining("Alex Le (you)Owner · Immutable"),
			expect.stringContaining("Mai TranCo-owner · Can manage Members"),
			expect.stringContaining("Bao NguyenMember · Can read and edit"),
		]);
		expect(screen.getByText("Your role: Owner")).toBeInTheDocument();
	});

	it("lets an Owner add a Co-owner by email", async () => {
		const { user } = renderAt(studyGroup);
		await user.click(await screen.findByRole("button", { name: "Add member" }));

		const dialog = within(
			screen.getByRole("dialog", { name: "Add an existing user" }),
		);
		await user.type(
			dialog.getByLabelText("Email of an existing platform user"),
			"vy.pham@example.com",
		);
		await user.selectOptions(
			dialog.getByLabelText("Membership role"),
			"CO_OWNER",
		);
		await user.click(dialog.getByRole("button", { name: "Add member" }));

		expect(
			await screen.findByText("Vy Pham was added as Co-owner."),
		).toBeInTheDocument();
		expect(screen.getByText(/^Vy Pham$/)).toBeInTheDocument();
		expect(memberIds("ws-systems-study-group")).toContain(mockUsers.vy.id);
	});

	it("shows the backend error for an unknown email", async () => {
		const { user } = renderAt(studyGroup);
		await user.click(await screen.findByRole("button", { name: "Add member" }));

		const dialog = within(
			screen.getByRole("dialog", { name: "Add an existing user" }),
		);
		await user.type(
			dialog.getByLabelText("Email of an existing platform user"),
			"nobody@example.com",
		);
		await user.click(dialog.getByRole("button", { name: "Add member" }));

		expect(await dialog.findByRole("alert")).toHaveTextContent(
			"No user with this email",
		);
	});

	it("lets an Owner remove a Co-owner after confirmation", async () => {
		const { user } = renderAt(studyGroup);
		await user.click(
			await screen.findByRole("button", { name: "Remove Mai Tran" }),
		);

		const dialog = within(
			screen.getByRole("dialog", { name: "Remove Mai Tran as Co-owner?" }),
		);
		await user.click(dialog.getByRole("button", { name: "Remove Co-owner" }));

		expect(
			await screen.findByText("Mai Tran was removed."),
		).toBeInTheDocument();
		expect(memberIds("ws-systems-study-group")).not.toContain(mockUsers.mai.id);
	});

	it("limits a Co-owner to adding and removing Members", async () => {
		const { user } = renderAt(studyGroup, mockUsers.mai.id);
		expect(await screen.findByText("Your role: Co-owner")).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Remove Bao Nguyen" }),
		).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "Remove Alex Le" }),
		).not.toBeInTheDocument();
		expect(
			screen.getByText("Co-owners can add and remove ordinary Members only."),
		).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: "Add member" }));
		const dialog = within(
			screen.getByRole("dialog", { name: "Add an existing user" }),
		);
		expect(dialog.queryByLabelText("Membership role")).not.toBeInTheDocument();
		await user.type(
			dialog.getByLabelText("Email of an existing platform user"),
			"vy.pham@example.com",
		);
		await user.click(dialog.getByRole("button", { name: "Add member" }));

		expect(
			await screen.findByText("Vy Pham was added as Member."),
		).toBeInTheDocument();
	});

	it("gives a Member a read-only list", async () => {
		renderAt(studyGroup, mockUsers.bao.id);
		expect(await screen.findByText("Your role: Member")).toBeInTheDocument();
		expect(screen.getByText("Alex Le")).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: /^Remove|Add member/ }),
		).not.toBeInTheDocument();
	});

	it("shows no member controls for the personal workspace", async () => {
		renderAt("/workspace/ws-personal-alex/members");
		expect(
			await screen.findByText(/This is your personal workspace/),
		).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "Add member" }),
		).not.toBeInTheDocument();
	});

	it("links to Members from a collaborative workspace", async () => {
		renderAt("/workspace/ws-systems-study-group");
		expect(
			await screen.findByRole("link", { name: "Members (3)" }),
		).toBeInTheDocument();
	});

	it("has no Members link in the personal workspace", async () => {
		renderAt("/workspace/ws-personal-alex");
		await screen.findByRole("link", { name: "Workspace settings" });
		expect(
			screen.queryByRole("link", { name: /^Members/ }),
		).not.toBeInTheDocument();
	});
});
