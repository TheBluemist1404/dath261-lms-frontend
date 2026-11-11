import {
	createMemoryHistory,
	createRouter,
	RouterProvider,
} from "@tanstack/react-router";
import { act, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Awareness } from "y-protocols/awareness";
import { routeTree } from "@/routeTree.gen";
import { signInForTest } from "@/test/auth";
import { server } from "@/test/mocks/server";
import { createTestQueryClient, renderWithProviders } from "@/test/render";
import {
	type ControllableConnection,
	collaborationUser,
	createControllableConnection,
	resetCollaborationAdapter,
	setCollaborationAdapter,
} from "../collaboration/collaboration";
import {
	DOCUMENT_FRAGMENT,
	seedSharedDocument,
} from "../collaboration/shared-document";
import { workspaceHandlers } from "../testing/handlers";
import { mockUsers, resetMockDb } from "../testing/mock-db";

vi.mock("@tanstack/react-devtools", () => ({ TanStackDevtools: () => null }));

const sharedPage =
	"/workspace/ws-systems-study-group/pages/page-group-processes";
const sharedSummary =
	"Shared summary: each process has its own address space, threads share it.";
let signOut = () => {};
let connection: ControllableConnection;
let retries = 0;

function renderAt(path: string, userId: string = mockUsers.alex.id) {
	signOut = signInForTest(userId);
	const router = createRouter({
		routeTree,
		history: createMemoryHistory({ initialEntries: [path] }),
		context: { queryClient: createTestQueryClient() },
	});
	return { router, ...renderWithProviders(<RouterProvider router={router} />) };
}

const editor = () => screen.findByRole("textbox", { name: "Page content" });

beforeEach(() => {
	resetMockDb();
	server.use(...workspaceHandlers);
	retries = 0;
	setCollaborationAdapter(({ userId, members }) => {
		const doc = seedSharedDocument(sharedSummary);
		connection = createControllableConnection(
			{ status: "connected", presentUserIds: [mockUsers.mai.id] },
			() => {
				retries += 1;
			},
			{
				fragment: doc.getXmlFragment(DOCUMENT_FRAGMENT),
				awareness: new Awareness(doc),
				user: collaborationUser(userId, members),
			},
		);
		return connection;
	});
});

afterEach(() => {
	signOut();
	resetCollaborationAdapter();
});

describe("Collaboration UI", () => {
	it("shows who is editing a shared page", async () => {
		renderAt(sharedPage);

		const presence = await screen.findByRole("list", {
			name: "2 people editing",
		});
		expect(presence).toHaveTextContent("Alex Le");
		expect(presence).toHaveTextContent("Mai Tran");
		expect(presence).not.toHaveTextContent("Bao Nguyen");
		expect(await editor()).not.toHaveAttribute("readonly");
	});

	it("pauses editing while reconnecting and resumes after sync", async () => {
		renderAt(sharedPage);
		const textbox = await editor();
		await screen.findByRole("list", { name: "2 people editing" });

		act(() => connection.set({ status: "reconnecting", presentUserIds: [] }));
		expect(
			screen.getByText("Reconnecting · Editing paused"),
		).toBeInTheDocument();
		expect(textbox).toHaveAttribute("readonly");
		expect(
			screen.getByRole("list", { name: "Last seen collaborators" }),
		).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "Retry synchronization" }),
		).not.toBeInTheDocument();

		act(() =>
			connection.set({
				status: "connected",
				presentUserIds: [mockUsers.mai.id],
			}),
		);
		expect(
			screen.queryByText("Reconnecting · Editing paused"),
		).not.toBeInTheDocument();
		expect(textbox).not.toHaveAttribute("readonly");
	});

	it("offers a retry when disconnected and keeps the text", async () => {
		const { user } = renderAt(sharedPage);
		const textbox = await editor();
		await screen.findByRole("list", { name: "2 people editing" });
		await user.type(textbox, "Draft line");

		act(() => connection.set({ status: "disconnected" }));
		expect(
			screen.getByText("Disconnected · Edits retained"),
		).toBeInTheDocument();
		expect(textbox).toHaveValue(
			"Shared summary: each process has its own address space, threads share it.Draft line",
		);

		await user.click(
			screen.getByRole("button", { name: "Retry synchronization" }),
		);
		expect(retries).toBe(1);
	});

	it("replaces the page when access is revoked", async () => {
		renderAt(sharedPage);
		await screen.findByRole("list", { name: "2 people editing" });

		act(() => connection.set({ status: "revoked" }));
		expect(
			await screen.findByRole("heading", {
				name: "Workspace access has ended.",
			}),
		).toBeInTheDocument();
		expect(
			screen.queryByRole("textbox", { name: "Page content" }),
		).not.toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: "Open my workspaces" }),
		).toHaveAttribute("href", "/workspace");
	});

	it("shows saving until the server confirms shared edits", async () => {
		renderAt(sharedPage);
		await screen.findByRole("list", { name: "2 people editing" });
		expect(await editor()).toHaveValue(sharedSummary);

		act(() => connection.set({ unsyncedChanges: 2 }));
		expect(screen.getByText("Saving your changes…")).toBeInTheDocument();

		act(() => connection.set({ unsyncedChanges: 0 }));
		expect(screen.getByText("All changes saved")).toBeInTheDocument();
	});

	it("follows the server when it only allows reading", async () => {
		renderAt(sharedPage);
		const textbox = await editor();
		await screen.findByRole("list", { name: "2 people editing" });

		act(() => connection.set({ readOnly: true }));
		expect(textbox).toHaveAttribute("readonly");
	});

	it("does not connect personal pages", async () => {
		const adapter = vi.fn();
		setCollaborationAdapter(adapter);
		renderAt("/workspace/ws-personal-alex/pages/page-processes");

		expect(await editor()).not.toHaveAttribute("readonly");
		expect(adapter).not.toHaveBeenCalled();
		expect(screen.queryByText(/people editing/)).not.toBeInTheDocument();
	});
});
