import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
	createMemoryHistory,
	createRootRoute,
	createRoute,
	createRouter,
	RouterProvider,
} from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { setAccessToken } from "@/lib/auth/access-token";
import { installAuthInterceptors } from "@/lib/http/auth-interceptors";
import { createMockAccessToken } from "@/mocks/auth.handlers";
import { server } from "@/test/mocks/server";
import { MyCoursesView } from "./my-courses-view";

function renderView() {
	const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	const root = createRootRoute();
	const index = createRoute({
		getParentRoute: () => root,
		path: "/",
		component: MyCoursesView,
	});
	const router = createRouter({
		routeTree: root.addChildren([index]),
		history: createMemoryHistory({ initialEntries: ["/"] }),
	});
	return render(
		<QueryClientProvider client={qc}>
			<RouterProvider router={router} />
		</QueryClientProvider>,
	);
}

describe("MyCoursesView", () => {
	beforeAll(() => {
		installAuthInterceptors();
	});

	beforeEach(() => {
		setAccessToken(createMockAccessToken("st-1", "STUDENT"));
	});

	afterEach(() => {
		setAccessToken(null);
	});

	it("renders active enrolled courses and preserves progress when switching to unavailable", async () => {
		const user = userEvent.setup();
		renderView();

		expect(
			await screen.findByText("Introduction to Computer Science"),
		).toBeInTheDocument();
		expect(await screen.findByText("60%")).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: "Resume Learning" }),
		).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: "Unavailable" }));
		expect(
			await screen.findByText("Advanced Operating Systems Lab"),
		).toBeInTheDocument();
		expect(screen.getByText("Progress preserved")).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: "View Details" }),
		).toBeInTheDocument();
		expect(
			screen.queryByRole("link", { name: "Resume Learning" }),
		).not.toBeInTheDocument();
	});

	it("renders empty state with catalog link when no active courses exist", async () => {
		server.use(
			http.get("*/api/users/me/enrollments", () => {
				return HttpResponse.json({
					data: [],
					meta: { total: 0, page: 1, limit: 9, totalPages: 1 },
				});
			}),
		);

		renderView();
		expect(await screen.findByText("No active courses")).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: "Explore Catalog" }),
		).toBeInTheDocument();
	});

	it("renders accessible error state with retry trigger on failure", async () => {
		server.use(
			http.get("*/api/users/me/enrollments", () => {
				return new HttpResponse(null, { status: 500 });
			}),
		);

		renderView();
		expect(
			await screen.findByRole("heading", {
				level: 3,
				name: "Failed to load courses",
			}),
		).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
	});
});
