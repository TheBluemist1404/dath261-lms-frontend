import { QueryClientProvider } from "@tanstack/react-query";
import {
	createMemoryHistory,
	createRouter,
	RouterProvider,
} from "@tanstack/react-router";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { delay, HttpResponse, http } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { routeTree } from "@/routeTree.gen";
import { useAuthStore } from "@/stores/auth.store";
import { server } from "@/test/mocks/server";
import { createTestQueryClient } from "@/test/render";
import { adminHandlers } from "../testing/handlers";
import { mockAdminDb, resetMockAdminDb } from "../testing/mock-db";
import type { PlatformStats } from "../types";

vi.mock("@tanstack/react-devtools", () => ({ TanStackDevtools: () => null }));

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

const emptyStats: PlatformStats = {
	users: { total: 0, students: 0, lecturers: 0, admins: 0, suspended: 0 },
	courses: { total: 0, published: 0, draft: 0, suspended: 0 },
	enrollments: { total: 0, active: 0, completed: 0, left: 0 },
	completionRate: 0,
	averageQuizScore: null,
	generatedAt: "2026-11-21T03:00:00.000Z",
};

beforeEach(() => {
	resetMockAdminDb();
	server.use(...adminHandlers);
	useAuthStore.getState().setUser({
		id: "admin-1",
		name: "Admin Le",
		email: "admin@example.com",
		role: "admin",
	});
});

describe("AD-01 Operational overview", () => {
	it("shows the Figma loading cards while the data loads", async () => {
		server.use(
			http.get("*/api/admin/stats", async () => {
				await delay("infinite");
				return HttpResponse.json(emptyStats);
			}),
		);
		renderAt("/admin");

		expect(
			await screen.findByRole("status", { name: "Loading overview" }),
		).toBeInTheDocument();
		expect(
			screen.queryByRole("list", { name: "Platform statistics" }),
		).not.toBeInTheDocument();
	});

	it("shows the platform stats and the moderation queue", async () => {
		renderAt("/admin");

		// Seed: 4 users (3 students, 1 lecturer), 2 published / 1 draft courses,
		// enrollments 9 active / 3 completed / 1 left, quiz 0.82, 2 open reports.
		const list = await screen.findByRole("list", {
			name: "Platform statistics",
		});
		const tiles = within(list).getAllByRole("listitem");
		expect(tiles[0]).toHaveTextContent(
			"4Registered users · 3 Students / 1 Lecturers",
		);
		expect(tiles[1]).toHaveTextContent(
			"2Published courses · 1 Draft / 0 Suspended",
		);
		expect(tiles[2]).toHaveTextContent(
			"9Active enrollments across available courses",
		);
		expect(
			screen.getByRole("progressbar", { name: "Confirmed Completed" }),
		).toHaveAttribute("aria-valuenow", "25");
		expect(screen.getByText("8.2 / 10")).toBeInTheDocument();
		const openReports = mockAdminDb.reports.filter(
			(report) => report.status === "PENDING",
		).length;
		expect(
			screen.getByText(
				new RegExp(`^${openReports} open reports require review\\.`),
			),
		).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: "Review reports" }),
		).toHaveAttribute("href", "/admin/reports");
	});

	it("counts only PENDING reports from the backend", async () => {
		const requests: URLSearchParams[] = [];
		server.use(
			http.get("*/api/admin/reports", ({ request }) => {
				requests.push(new URL(request.url).searchParams);
				return HttpResponse.json({
					items: [],
					page: 1,
					pageSize: 1,
					total: 8,
				});
			}),
		);
		renderAt("/admin");

		expect(
			await screen.findByText(/^8 open reports require review\./),
		).toBeInTheDocument();
		expect(requests).toHaveLength(1);
		expect(requests[0].get("status")).toBe("PENDING");
		expect(requests[0].get("pageSize")).toBe("1");
	});

	it("shows a dash when no released results exist", async () => {
		mockAdminDb.activity.averageQuizScore = null;
		renderAt("/admin");

		const card = (
			await screen.findByRole("heading", { name: "Released result summary" })
		).closest("section");
		expect(card).toHaveTextContent("—Aggregate normalized score");
	});

	it("shows the Figma no data state when nothing is published or enrolled", async () => {
		server.use(
			http.get("*/api/admin/stats", () =>
				HttpResponse.json({
					...emptyStats,
					users: { ...emptyStats.users, total: 1, admins: 1 },
				}),
			),
		);
		renderAt("/admin");

		expect(
			await screen.findByText("No platform activity yet."),
		).toBeInTheDocument();
		expect(
			screen.getByText(
				"Aggregate metrics will appear as users enroll and courses publish.",
			),
		).toBeInTheDocument();
		expect(
			screen.queryByRole("list", { name: "Platform statistics" }),
		).not.toBeInTheDocument();
	});

	it("shows the Figma failure state and retries", async () => {
		let fail = true;
		server.use(
			http.get("*/api/admin/stats", () =>
				fail
					? HttpResponse.json(
							{ statusCode: 500, message: "Internal server error" },
							{ status: 500 },
						)
					: HttpResponse.json(emptyStats),
			),
		);
		const user = userEvent.setup();
		renderAt("/admin");

		const alert = await screen.findByRole("alert");
		expect(alert).toHaveTextContent(
			"We could not load this view.Your existing data is safe. Check your connection and try again.",
		);

		fail = false;
		await user.click(within(alert).getByRole("button", { name: "Retry" }));
		expect(
			await screen.findByText("No platform activity yet."),
		).toBeInTheDocument();
	});

	it("shows the failure state when the open report count fails", async () => {
		server.use(
			http.get("*/api/admin/reports", () =>
				HttpResponse.json(
					{ statusCode: 500, message: "Internal server error" },
					{ status: 500 },
				),
			),
		);
		renderAt("/admin");

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"We could not load this view.",
		);
	});
});
