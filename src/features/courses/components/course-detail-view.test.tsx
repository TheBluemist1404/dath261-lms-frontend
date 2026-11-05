import { QueryClientProvider } from "@tanstack/react-query";
import {
	createMemoryHistory,
	createRootRoute,
	createRoute,
	createRouter,
	RouterProvider,
} from "@tanstack/react-router";
import { render, screen, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import { mockDraftCourse } from "@/mocks/courses.fixtures";
import { server } from "@/test/mocks/server";
import { createTestQueryClient } from "@/test/render";
import { CourseDetailView } from "./course-detail-view";

function renderDetailView(courseId: string) {
	const queryClient = createTestQueryClient();
	const rootRoute = createRootRoute();
	const catalogRoute = createRoute({
		getParentRoute: () => rootRoute,
		path: "/catalog",
		component: () => <div>Catalog page</div>,
	});
	const detailRoute = createRoute({
		getParentRoute: () => rootRoute,
		path: "/courses/$courseId",
		component: () => <CourseDetailView courseId={courseId} />,
	});

	const router = createRouter({
		routeTree: rootRoute.addChildren([catalogRoute, detailRoute]),
		history: createMemoryHistory({
			initialEntries: [`/courses/${courseId}`],
		}),
	});

	render(
		<QueryClientProvider client={queryClient}>
			<RouterProvider router={router} />
		</QueryClientProvider>,
	);
}

describe("CourseDetailView", () => {
	it("renders course details and syllabus for published course", async () => {
		renderDetailView("course-os");

		expect(
			await screen.findByRole("heading", {
				level: 1,
				name: "Operating Systems",
			}),
		).toBeInTheDocument();

		expect(
			screen.getByRole("heading", {
				level: 2,
				name: "Prerequisites & Preparation",
			}),
		).toBeInTheDocument();

		expect(
			screen.getByRole("heading", { level: 2, name: "About this course" }),
		).toBeInTheDocument();

		await waitFor(() => {
			expect(
				screen.getByText("Module 1: Kernel Architecture & System Calls"),
			).toBeInTheDocument();
		});
	});

	it("renders course not found state on missing course", async () => {
		server.use(
			http.get("*/api/courses/non-existent", () => {
				return new HttpResponse(null, { status: 404 });
			}),
		);

		renderDetailView("non-existent");

		expect(
			await screen.findByRole("heading", {
				level: 1,
				name: "Course Not Found",
			}),
		).toBeInTheDocument();
	});

	it("contains draft course by displaying not found state", async () => {
		server.use(
			http.get("*/api/courses/course-draft", () => {
				return HttpResponse.json(mockDraftCourse);
			}),
		);

		renderDetailView("course-draft");

		expect(
			await screen.findByRole("heading", {
				level: 1,
				name: "Course Not Found",
			}),
		).toBeInTheDocument();
		expect(
			screen.queryByText("Draft Advanced Algorithms"),
		).not.toBeInTheDocument();
	});
});
