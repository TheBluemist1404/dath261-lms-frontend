import { QueryClientProvider } from "@tanstack/react-query";
import {
	createMemoryHistory,
	createRouter,
	RouterProvider,
} from "@tanstack/react-router";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { routeTree } from "@/routeTree.gen";
import { createTestQueryClient } from "@/test/render";

vi.mock("@tanstack/react-devtools", () => ({ TanStackDevtools: () => null }));

function renderCatalog(path = "/catalog") {
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

	return { queryClient, router };
}

describe("CatalogView", () => {
	it("renders catalog hero and course list on successful query", async () => {
		renderCatalog("/catalog");

		await waitFor(() => {
			expect(screen.getByText("Explore courses")).toBeInTheDocument();
		});
		expect(
			screen.getByText(
				/Discover curated courses taught by university lecturers/i,
			),
		).toBeInTheDocument();

		await waitFor(() => {
			expect(screen.getByText("Operating Systems")).toBeInTheDocument();
		});

		expect(
			screen.getByText("Introduction to Computer Science"),
		).toBeInTheDocument();
		expect(screen.getByText("Database Design")).toBeInTheDocument();
	});

	it("filters courses when search query is entered", async () => {
		renderCatalog("/catalog?search=Database");

		await waitFor(() => {
			expect(screen.getByText("Database Design")).toBeInTheDocument();
		});

		expect(screen.queryByText("Operating Systems")).not.toBeInTheDocument();
	});

	it("displays empty state when no courses match", async () => {
		renderCatalog("/catalog?search=non-existent-course-query-xyz");

		await waitFor(() => {
			expect(screen.getByText("No matching courses found")).toBeInTheDocument();
		});

		expect(
			screen.getByRole("button", { name: "Clear filters" }),
		).toBeInTheDocument();
	});
});
