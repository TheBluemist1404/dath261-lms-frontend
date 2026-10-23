import {
	createMemoryHistory,
	createRouter,
	RouterProvider,
} from "@tanstack/react-router";
import { act, screen, within } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { routeTree } from "@/routeTree.gen";
import { signInForTest } from "@/test/auth";
import { server } from "@/test/mocks/server";
import { createTestQueryClient, renderWithProviders } from "@/test/render";
import {
	type DiscussionListeners,
	resetDiscussionChannel,
	setDiscussionChannel,
} from "../collaboration/discussion-channel";
import { workspaceHandlers } from "../testing/handlers";
import { mockDb, mockUsers, resetMockDb } from "../testing/mock-db";

vi.mock("@tanstack/react-devtools", () => ({ TanStackDevtools: () => null }));

const discussion =
	"/workspace/ws-systems-study-group/discussion/page-group-processes";
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

afterEach(() => {
	signOut();
	resetDiscussionChannel();
});

/** Captures the live channel the discussion subscribes to. */
function fakeChannel() {
	const subscriptions: { pageId: string; listeners: DiscussionListeners }[] =
		[];
	setDiscussionChannel((pageId, listeners) => {
		const entry = { pageId, listeners };
		subscriptions.push(entry);
		return () => subscriptions.splice(subscriptions.indexOf(entry), 1);
	});
	return subscriptions;
}

const liveMessage = {
	id: "msg-live-1",
	pageId: "page-group-processes",
	sender: { id: mockUsers.mai.id, firstName: "Mai", lastName: "Tran" },
	content: "Just joined, reading the notes now.",
	createdAt: new Date().toISOString(),
};

describe("Page discussion", () => {
	it("shows messages other members post while it is open", async () => {
		const subscriptions = fakeChannel();
		renderAt(discussion);
		const messages = await screen.findByRole("list", { name: "Messages" });
		expect(subscriptions.map((entry) => entry.pageId)).toEqual([
			"page-group-processes",
		]);

		act(() => subscriptions[0].listeners.onMessage(liveMessage));
		act(() => subscriptions[0].listeners.onMessage(liveMessage));

		expect(
			await within(messages).findByText("Just joined, reading the notes now."),
		).toBeInTheDocument();
		expect(
			within(messages).getAllByText("Just joined, reading the notes now."),
		).toHaveLength(1);
	});

	it("lists an own message once when its broadcast arrives too", async () => {
		const subscriptions = fakeChannel();
		const { user } = renderAt(discussion);
		await user.type(await screen.findByLabelText("Message"), "Own post");
		await user.click(screen.getByRole("button", { name: "Send message" }));
		const messages = screen.getByRole("list", { name: "Messages" });
		await within(messages).findByText("Own post");

		const sent = mockDb.messages.find((entry) => entry.content === "Own post");
		act(() =>
			subscriptions[0].listeners.onMessage({
				id: sent?.id ?? "",
				pageId: "page-group-processes",
				sender: { id: mockUsers.alex.id, firstName: "Alex", lastName: "Le" },
				content: "Own post",
				createdAt: sent?.createdAt ?? "",
			}),
		);
		await new Promise((resolve) => setTimeout(resolve, 50));
		expect(within(messages).getAllByText("Own post")).toHaveLength(1);
	});

	it("shows access ended when the server ends the subscription", async () => {
		const subscriptions = fakeChannel();
		renderAt(discussion);
		await screen.findByRole("list", { name: "Messages" });

		mockDb.memberships = mockDb.memberships.filter(
			(entry) =>
				!(
					entry.workspaceId === "ws-systems-study-group" &&
					entry.userId === mockUsers.alex.id
				),
		);
		act(() => subscriptions[0].listeners.onAccessEnded());

		expect(
			await screen.findByRole("heading", { name: "Access revoked" }),
		).toBeInTheDocument();
	});

	it("does not subscribe on personal pages", async () => {
		const subscriptions = fakeChannel();
		renderAt("/workspace/ws-personal-alex/discussion/page-processes");
		expect((await screen.findAllByRole("heading")).length).toBeGreaterThan(0);
		expect(subscriptions).toHaveLength(0);
	});

	it("shows the page context, passage and existing messages", async () => {
		renderAt(`${discussion}?passage=A%20process%20can%20be%20ready`);

		expect(
			await screen.findByText("Systems study group / Processes"),
		).toBeInTheDocument();
		expect(screen.getByText("“A process can be ready”")).toBeInTheDocument();
		const messages = screen.getByRole("list", { name: "Messages" });
		expect(messages).toHaveTextContent("Mai Tran");
		expect(messages).toHaveTextContent(
			"The scheduling example helped me understand this.",
		);
	});

	it("sends a message", async () => {
		const { user } = renderAt(discussion);
		const field = await screen.findByLabelText("Message");
		await user.type(field, "How does preemption affect the ready queue?");
		await user.click(screen.getByRole("button", { name: "Send message" }));

		expect(
			await within(screen.getByRole("list", { name: "Messages" })).findByText(
				"How does preemption affect the ready queue?",
			),
		).toBeInTheDocument();
		expect(field).toHaveValue("");
		expect(mockDb.messages.at(-1)).toMatchObject({
			senderId: mockUsers.alex.id,
			pageId: "page-group-processes",
		});
	});

	it("keeps the text and offers a retry when sending fails", async () => {
		let fail = true;
		server.use(
			http.post("*/api/pages/:pageId/messages", () =>
				fail
					? HttpResponse.json({ statusCode: 500 }, { status: 500 })
					: undefined,
			),
		);
		const { user } = renderAt(discussion);
		const field = await screen.findByLabelText("Message");
		await user.type(field, "Retry me");
		await user.click(screen.getByRole("button", { name: "Send message" }));

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"Message could not be sent.",
		);
		expect(field).toHaveValue("Retry me");

		fail = false;
		await user.click(screen.getByRole("button", { name: "Retry message" }));
		expect(await screen.findByText("Retry me")).toBeInTheDocument();
		expect(screen.queryByRole("alert")).not.toBeInTheDocument();
	});

	it("shows the empty state", async () => {
		mockDb.messages = [];
		renderAt(discussion);

		expect(
			await screen.findByText("Start a discussion about this page."),
		).toBeInTheDocument();
	});

	it("reports another member's message", async () => {
		const { user } = renderAt(discussion);
		await user.click(
			await screen.findByRole("button", {
				name: "Report message from Mai Tran",
			}),
		);

		const dialog = within(
			screen.getByRole("dialog", { name: "Report shared content" }),
		);
		expect(
			dialog.getByText(/Systems study group \/ Discussion message/),
		).toBeInTheDocument();
		await user.selectOptions(
			dialog.getByLabelText("Reason"),
			"Spam or advertising",
		);
		await user.type(
			dialog.getByLabelText("Details (optional)"),
			"Unrelated links",
		);
		await user.click(dialog.getByRole("button", { name: "Send report" }));

		expect(
			await screen.findByText("Report sent. An administrator will review it."),
		).toBeInTheDocument();
		expect(mockDb.reports).toEqual([
			expect.objectContaining({
				reporterId: mockUsers.alex.id,
				targetId: "msg-mai-1",
				reason: "Spam or advertising",
				description: "Unrelated links",
			}),
		]);
	});

	it("does not offer to report your own message", async () => {
		renderAt(discussion, mockUsers.mai.id);
		await screen.findByRole("list", { name: "Messages" });

		expect(
			screen.queryByRole("button", { name: /^Report message/ }),
		).not.toBeInTheDocument();
	});

	it("shows access revoked when the user is no longer a member", async () => {
		renderAt(discussion, mockUsers.vy.id);

		expect(
			await screen.findByRole("heading", { name: "Access revoked" }),
		).toBeInTheDocument();
		expect(screen.queryByLabelText("Message")).not.toBeInTheDocument();
	});

	it("is linked from shared pages only", async () => {
		renderAt("/workspace/ws-systems-study-group/pages/page-group-processes");
		expect(
			await screen.findByRole("link", { name: "Discussion" }),
		).toHaveAttribute("href", discussion);
	});

	it("has no discussion link on personal pages", async () => {
		renderAt("/workspace/ws-personal-alex/pages/page-processes");
		await screen.findByRole("textbox", { name: "Page content" });
		expect(
			screen.queryByRole("link", { name: "Discussion" }),
		).not.toBeInTheDocument();
	});
});
