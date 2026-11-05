import {
	createMemoryHistory,
	createRootRoute,
	createRoute,
	createRouter,
	RouterProvider,
} from "@tanstack/react-router";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Course } from "../types/course.types";
import { CourseCard } from "./course-card";

const sampleCourse: Course = {
	id: "course-os",
	title: "Operating Systems",
	description: "Processes, virtual memory and file systems.",
	prerequisites: "Intro to C programming.",
	status: "PUBLISHED",
	enrollmentStartAt: null,
	enrollmentEndAt: null,
	lecturer: {
		id: "lecturer-1",
		name: "Dr. Elena Rostova",
	},
};

function renderCourseCard(course: Course) {
	const rootRoute = createRootRoute();
	const indexRoute = createRoute({
		getParentRoute: () => rootRoute,
		path: "/",
		component: () => <CourseCard course={course} />,
	});

	const router = createRouter({
		routeTree: rootRoute.addChildren([indexRoute]),
		history: createMemoryHistory({ initialEntries: ["/"] }),
	});

	render(<RouterProvider router={router} />);
}

describe("CourseCard", () => {
	it("renders course details and metadata chips", async () => {
		renderCourseCard(sampleCourse);

		await waitFor(() => {
			expect(screen.getByText("Operating Systems")).toBeInTheDocument();
		});

		expect(
			screen.getByText("Processes, virtual memory and file systems."),
		).toBeInTheDocument();
		expect(screen.getByText("Dr. Elena Rostova")).toBeInTheDocument();
		expect(screen.getByText("Self-paced")).toBeInTheDocument();
		expect(screen.getByText("Open")).toBeInTheDocument();
	});

	it("displays Closed badge when enrollment window has passed", async () => {
		const closedCourse: Course = {
			...sampleCourse,
			id: "course-closed",
			enrollmentEndAt: "2020-01-01T00:00:00.000Z",
		};

		renderCourseCard(closedCourse);

		await waitFor(() => {
			expect(screen.getByText("Closed")).toBeInTheDocument();
		});
	});
});
