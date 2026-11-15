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

const personalPage = "/workspace/ws-personal-alex/pages/page-processes";
const groupPage =
	"/workspace/ws-systems-study-group/pages/page-group-processes";
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

async function openPicker(user: ReturnType<typeof renderAt>["user"]) {
	await user.click(
		await screen.findByRole("button", { name: "Insert course reference" }),
	);
	return within(
		screen.getByRole("dialog", { name: "Insert a course reference" }),
	);
}

beforeEach(() => {
	resetMockDb();
	server.use(...workspaceHandlers);
});

afterEach(() => signOut());

describe("Course references", () => {
	it("shows authorized file and timestamped video references", async () => {
		renderAt(personalPage);

		expect(
			await screen.findByText("Lecture 2 · Processes"),
		).toBeInTheDocument();
		expect(
			screen.getByText(
				"Course video reference · Operating Systems · Starts at 4:32",
			),
		).toBeInTheDocument();
		expect(screen.getByText("Lecture 2 slides")).toBeInTheDocument();

		const links = screen.getAllByRole("link", { name: "Open source →" });
		expect(links[0]).toHaveAttribute(
			"href",
			"/courses/course-os?block=block-os-lecture2&t=272",
		);
		expect(links[1]).toHaveAttribute(
			"href",
			"/courses/course-os?block=block-os-slides2",
		);
	});

	it("locks references without leaking block metadata", async () => {
		renderAt(groupPage);

		expect(
			await screen.findByText("Locked · Course access required"),
		).toBeInTheDocument();
		expect(screen.getByText("Source no longer available")).toBeInTheDocument();
		expect(screen.getAllByText("Protected reference")).toHaveLength(2);
		expect(screen.queryByText(/TCP handshake/)).not.toBeInTheDocument();
		expect(screen.queryByText(/Relational model/)).not.toBeInTheDocument();
		expect(screen.queryByText(/Computer Networks/)).not.toBeInTheDocument();
	});

	it("resolves the same reference per viewer", async () => {
		renderAt(groupPage, mockUsers.mai.id);

		expect(await screen.findByText("TCP handshake notes")).toBeInTheDocument();
		expect(
			screen.getByText("Locked · Course access required"),
		).toBeInTheDocument();
	});

	it("inserts a video reference with a validated timestamp", async () => {
		const { user } = renderAt(personalPage);
		const dialog = await openPicker(user);

		expect(
			dialog.getByText(/My personal workspace \/ Understanding processes/),
		).toBeInTheDocument();
		await user.click(dialog.getByRole("button", { name: "Video" }));
		await user.click(
			await dialog.findByRole("radio", { name: /Lecture 3 · CPU scheduling/ }),
		);

		const field = dialog.getByLabelText("Start at timestamp (optional)");
		await user.type(field, "99:99");
		await user.click(dialog.getByRole("button", { name: "Insert reference" }));
		expect(field).toHaveAttribute("aria-invalid", "true");
		expect(field).toHaveAccessibleDescription(
			expect.stringContaining("no later than 45:00"),
		);

		await user.clear(field);
		await user.type(field, "46:00");
		await user.click(dialog.getByRole("button", { name: "Insert reference" }));
		expect(field).toHaveAttribute("aria-invalid", "true");

		await user.clear(field);
		await user.type(field, "12:05");
		await user.click(dialog.getByRole("button", { name: "Insert reference" }));

		expect(
			await screen.findByText(
				"Course video reference · Operating Systems · Starts at 12:05",
			),
		).toBeInTheDocument();
		expect(
			mockDb.references.find(
				(reference) => reference.courseBlockId === "block-os-scheduling",
			),
		).toMatchObject({ pageId: "page-processes", timestampSeconds: 725 });
	});

	it("only offers materials from courses the user can access", async () => {
		const { user } = renderAt(personalPage);
		const dialog = await openPicker(user);

		expect(
			await dialog.findByRole("radio", { name: /Lecture 2 slides/ }),
		).toBeInTheDocument();
		expect(dialog.queryByText(/TCP handshake/)).not.toBeInTheDocument();

		await user.type(dialog.getByLabelText("Search course materials"), "tcp");
		expect(
			await dialog.findByText("No course files match “tcp”."),
		).toBeInTheDocument();
	});

	it("explains when there is nothing eligible", async () => {
		const { user } = renderAt(groupPage, mockUsers.bao.id);
		const dialog = await openPicker(user);

		expect(
			await dialog.findByText(/No eligible course files/),
		).toBeInTheDocument();
		expect(
			dialog.getByRole("button", { name: "Insert reference" }),
		).toBeDisabled();
	});

	it("removes a reference", async () => {
		const { user } = renderAt(personalPage);
		await user.click(
			await screen.findByRole("button", {
				name: "Remove reference to Lecture 2 slides",
			}),
		);

		await vi.waitFor(() =>
			expect(screen.queryByText("Lecture 2 slides")).not.toBeInTheDocument(),
		);
		expect(
			mockDb.references.some(
				(reference) => reference.id === "ref-processes-slides",
			),
		).toBe(false);
	});

	it("is read-only in an archived workspace", async () => {
		mockDb.references.push({
			id: "ref-old",
			pageId: "page-old",
			courseBlockId: "block-os-slides2",
			timestampSeconds: null,
			createdAt: "2026-10-20T08:00:00.000Z",
		});
		renderAt("/workspace/ws-old-project/pages/page-old");

		expect(await screen.findByText("Lecture 2 slides")).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "Insert course reference" }),
		).not.toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: /^Remove/ }),
		).not.toBeInTheDocument();
	});
});
