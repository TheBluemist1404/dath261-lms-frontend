import { QueryClientProvider } from "@tanstack/react-query";
import {
	createMemoryHistory,
	createRouter,
	RouterProvider,
} from "@tanstack/react-router";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { routeTree } from "@/routeTree.gen";
import { useAuthStore } from "@/stores/auth.store";
import { server } from "@/test/mocks/server";
import { createTestQueryClient } from "@/test/render";
import { adminHandlers } from "../testing/handlers";
import {
	mockAdminDb,
	resetMockAdminDb,
	sharedContentReport,
} from "../testing/mock-db";

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

/** The open <dialog>; hidden dialogs stay in the DOM. */
async function openDialog(name: string | RegExp) {
	return screen.findByRole("dialog", { name });
}

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

describe("AD-04 Reports", () => {
	it("lists open reports and filters by review status", async () => {
		const user = userEvent.setup();
		renderAt("/admin/reports");

		const row = await screen.findByRole("button", {
			name: "Operating Systems · Course",
		});
		expect(row.closest("tr")).toHaveTextContent(
			"Misleading course informationMai Tran · Oct 02, 14:20Open",
		);
		expect(
			screen.getByRole("button", { name: "User account · Bao Nguyen" }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: "Review course report" }),
		).toHaveAttribute("href", "/admin/reports/R-1048");

		await user.click(screen.getByRole("tab", { name: "Dismissed" }));
		expect(
			await screen.findByText("No reports to review."),
		).toBeInTheDocument();
		expect(
			screen.getByText("New reports will appear in this queue."),
		).toBeInTheDocument();
	});

	it("shows an error with a retry when the queue cannot load", async () => {
		server.use(
			http.get("*/api/admin/reports", () =>
				HttpResponse.json(
					{ statusCode: 500, message: "Server error" },
					{ status: 500 },
				),
			),
		);
		renderAt("/admin/reports");

		expect(await screen.findByRole("alert")).toHaveTextContent("Server error");
		expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
	});
});

describe("AD-05 Report review", () => {
	it("dismisses a report with a recorded reason", async () => {
		const user = userEvent.setup();
		renderAt("/admin/reports/R-1048");

		expect(
			await screen.findByRole("heading", { name: "Report review" }),
		).toBeInTheDocument();
		expect(
			await screen.findByText("Report #R-1048 · Course target"),
		).toBeInTheDocument();
		expect(screen.getByText("Scoped target context")).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: "Dismiss report" }));
		const dialog = await openDialog("Dismiss report #R-1048?");
		await user.click(
			within(dialog).getByRole("button", { name: "Dismiss report" }),
		);

		expect(
			await screen.findByText("The review decision and reason are recorded."),
		).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "Suspend course" }),
		).not.toBeInTheDocument();
		expect(mockAdminDb.reports[0].status).toBe("DISMISSED");
	});

	it("requires a reason before dismissing", async () => {
		const user = userEvent.setup();
		renderAt("/admin/reports/R-1048");

		await user.click(
			await screen.findByRole("button", { name: "Dismiss report" }),
		);
		const dialog = await openDialog("Dismiss report #R-1048?");
		await user.clear(within(dialog).getByLabelText("Reason"));
		await user.click(
			within(dialog).getByRole("button", { name: "Dismiss report" }),
		);

		expect(dialog).toHaveAttribute("open");
		expect(mockAdminDb.reports[0].status).toBe("PENDING");
	});

	it("suspends the reported course and resolves the report", async () => {
		const user = userEvent.setup();
		renderAt("/admin/reports/R-1048");

		await user.click(
			await screen.findByRole("button", { name: "Suspend course" }),
		);
		const dialog = await openDialog("Suspend Operating Systems?");
		await user.click(
			within(dialog).getByRole("button", { name: "Suspend course" }),
		);

		expect(
			await screen.findByText("Report resolved · Action taken"),
		).toBeInTheDocument();
		expect(
			screen.getByText(/Course suspended\. The action is recorded/),
		).toBeInTheDocument();
		expect(mockAdminDb.courses[0].isSuspended).toBe(true);
	});

	it("warns when the target is unavailable", async () => {
		mockAdminDb.reports[0].target.available = false;
		renderAt("/admin/reports/R-1048");

		expect(
			await screen.findByText("Target is unavailable"),
		).toBeInTheDocument();
		expect(screen.queryByText("Scoped target context")).not.toBeInTheDocument();
	});

	it("scopes a shared-content report to the reported message", async () => {
		mockAdminDb.reports.push(sharedContentReport());
		const user = userEvent.setup();
		renderAt("/admin/reports/R-1052");

		expect(
			await screen.findByRole("heading", {
				name: "Review shared-content report",
			}),
		).toBeInTheDocument();
		expect(
			screen.getByText("“Visit my store instead of studying this module.”"),
		).toBeInTheDocument();

		await user.click(
			screen.getByRole("button", { name: "Suspend related user" }),
		);
		const dialog = await openDialog("Suspend Mai Tran?");
		await user.click(
			within(dialog).getByRole("button", { name: "Suspend account" }),
		);

		await waitFor(() =>
			expect(
				mockAdminDb.users.find((entry) => entry.id === "user-mai")?.status,
			).toBe("SUSPENDED"),
		);
	});
});

describe("AD-02 Users", () => {
	it("suspends and restores an account", async () => {
		const user = userEvent.setup();
		renderAt("/admin/users");

		expect(
			await screen.findByText("Mai Tran · Account summary"),
		).toBeInTheDocument();
		await user.click(screen.getByRole("button", { name: "Suspend account" }));
		let dialog = await openDialog("Suspend Mai Tran?");
		await user.click(
			within(dialog).getByRole("button", { name: "Suspend account" }),
		);

		expect(await screen.findByText("Account suspended")).toBeInTheDocument();
		await user.click(screen.getByRole("button", { name: "Restore account" }));
		dialog = await openDialog("Restore Mai Tran?");
		await user.click(
			within(dialog).getByRole("button", { name: "Restore account" }),
		);

		expect(
			await screen.findByRole("button", { name: "Suspend account" }),
		).toBeInTheDocument();
		expect(mockAdminDb.users[0].status).toBe("ACTIVE");
	});

	it("searches by name or email", async () => {
		const user = userEvent.setup();
		renderAt("/admin/users");

		await user.type(
			await screen.findByPlaceholderText("Search name or email"),
			"linh.nguyen@",
		);
		expect(
			screen.getByRole("button", {
				name: "Dr. Linh Nguyen · linh.nguyen@example.com",
			}),
		).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: /Mai Tran ·/ }),
		).not.toBeInTheDocument();
	});
});

describe("Backend admin routes (BE PR #36)", () => {
	function recordPatches() {
		const calls: { path: string; body: unknown }[] = [];
		server.use(
			http.patch("*/api/admin/*", async ({ request }) => {
				calls.push({
					path: new URL(request.url).pathname,
					body: await request.clone().json(),
				});
			}),
		);
		return calls;
	}

	it("suspends a user with PATCH /admin/users/:userId/status", async () => {
		const calls = recordPatches();
		const user = userEvent.setup();
		renderAt("/admin/users");

		await user.click(
			await screen.findByRole("button", { name: "Suspend account" }),
		);
		const dialog = await openDialog("Suspend Mai Tran?");
		await user.click(
			within(dialog).getByRole("button", { name: "Suspend account" }),
		);

		await waitFor(() =>
			expect(calls).toEqual([
				{
					path: "/api/admin/users/user-mai/status",
					body: {
						status: "SUSPENDED",
						reason: "Reviewed the report and target context.",
					},
				},
			]),
		);
	});

	it("suspends a course with PATCH /admin/courses/:courseId/suspension", async () => {
		const calls = recordPatches();
		const user = userEvent.setup();
		renderAt("/admin/courses");

		await user.click(
			await screen.findByRole("button", { name: "Suspend course" }),
		);
		const dialog = await openDialog("Suspend Operating Systems?");
		await user.click(
			within(dialog).getByRole("button", { name: "Suspend course" }),
		);

		await waitFor(() =>
			expect(calls).toEqual([
				{
					path: "/api/admin/courses/course-os/suspension",
					body: {
						suspended: true,
						reason: "Reviewed the report and target context.",
					},
				},
			]),
		);
	});

	it("reads users from the paged response", async () => {
		server.use(
			http.get("*/api/admin/users", () =>
				HttpResponse.json({
					items: [mockAdminDb.users[1]],
					page: 1,
					pageSize: 20,
					total: 1,
				}),
			),
		);
		renderAt("/admin/users");

		expect(
			await screen.findByRole("button", {
				name: "Dr. Linh Nguyen · linh.nguyen@example.com",
			}),
		).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: /Mai Tran ·/ }),
		).not.toBeInTheDocument();
	});
});

describe("AD-03 Courses", () => {
	it("suspends a course without changing its publication status", async () => {
		const user = userEvent.setup();
		renderAt("/admin/courses");

		expect(
			await screen.findByText("Operating Systems · Operational summary"),
		).toBeInTheDocument();
		await user.click(screen.getByRole("button", { name: "Suspend course" }));
		const dialog = await openDialog("Suspend Operating Systems?");
		await user.click(
			within(dialog).getByRole("button", { name: "Suspend course" }),
		);

		expect(
			await screen.findByRole("button", { name: "Restore course" }),
		).toBeInTheDocument();
		const row = screen
			.getByRole("button", { name: "Operating Systems · Dr. Linh Nguyen" })
			.closest("tr");
		expect(row).toHaveTextContent("PublishedSuspended42");

		await user.click(screen.getByRole("tab", { name: "Suspended" }));
		expect(
			screen.queryByRole("button", { name: /Database Design/ }),
		).not.toBeInTheDocument();
	});
});
