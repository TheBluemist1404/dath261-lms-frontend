import {
	createMemoryHistory,
	createRouter,
	RouterProvider,
} from "@tanstack/react-router";
import { act, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { routeTree } from "@/routeTree.gen";
import { signInForTest } from "@/test/auth";
import { server } from "@/test/mocks/server";
import { createTestQueryClient, renderWithProviders } from "@/test/render";
import {
	type ControllableConnection,
	createControllableConnection,
	resetCollaborationAdapter,
	setCollaborationAdapter,
} from "../collaboration/collaboration";
import { workspaceHandlers } from "../testing/handlers";
import { mockUsers, resetMockDb } from "../testing/mock-db";

vi.mock("@tanstack/react-devtools", () => ({ TanStackDevtools: () => null }));

const sharedPage =
	"/workspace/ws-systems-study-group/pages/page-group-processes";
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
	setCollaborationAdapter(() => {
		connection = createControllableConnection(
			{ status: "connected", presentUserIds: [mockUsers.mai.id] },
			() => {
				retries += 1;
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
			screen.getByRole("heading", { name: "Workspace access has ended." }),
		).toBeInTheDocument();
		expect(
			screen.queryByRole("textbox", { name: "Page content" }),
		).not.toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: "Open my workspaces" }),
		).toHaveAttribute("href", "/workspace");
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
