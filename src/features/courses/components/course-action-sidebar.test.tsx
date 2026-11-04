import {
	createMemoryHistory,
	createRootRoute,
	createRoute,
	createRouter,
	RouterProvider,
} from "@tanstack/react-router";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { useAuthStore } from "@/stores/auth.store";
import type { Course } from "../types/course.types";
import { CourseActionSidebar } from "./course-action-sidebar";

const sampleCourse: Course = {
	id: "course-os",
	title: "Operating Systems",
	description: "System programming.",
	prerequisites: "C programming.",
	status: "PUBLISHED",
	enrollmentStartAt: null,
	enrollmentEndAt: null,
	lecturer: { id: "lec-1", name: "Dr. Elena" },
};

function renderSidebar(course: Course) {
	const rootRoute = createRootRoute();
	const indexRoute = createRoute({
		getParentRoute: () => rootRoute,
		path: "/",
		component: () => <CourseActionSidebar course={course} />,
	});

	const router = createRouter({
		routeTree: rootRoute.addChildren([indexRoute]),
		history: createMemoryHistory({ initialEntries: ["/"] }),
	});

	render(<RouterProvider router={router} />);
}

describe("CourseActionSidebar", () => {
	beforeEach(() => {
		useAuthStore.getState().setUser(null);
	});

	it("shows login call to action for guests", async () => {
		renderSidebar(sampleCourse);

		await waitFor(() => {
			const link = screen.getByRole("link", { name: "Log in to enroll" });
			expect(link).toBeInTheDocument();
		});
	});

	it("enables enrollment action for authenticated students", async () => {
		useAuthStore.getState().setUser({
			id: "student-1",
			email: "student@example.com",
			name: "Student One",
			role: "student",
		});

		const user = userEvent.setup();
		renderSidebar(sampleCourse);

		const enrollButton = await screen.findByRole("button", {
			name: "Enroll in Course",
		});
		expect(enrollButton).toBeEnabled();

		await user.click(enrollButton);
		expect(screen.getByRole("status")).toHaveTextContent(
			"Student enrollment workflows will be enabled",
		);
	});

	it("displays disabled state when enrollment window is closed", async () => {
		useAuthStore.getState().setUser({
			id: "student-1",
			email: "student@example.com",
			name: "Student One",
			role: "student",
		});

		const closedCourse: Course = {
			...sampleCourse,
			enrollmentEndAt: "2020-01-01T00:00:00Z",
		};

		renderSidebar(closedCourse);

		const button = await screen.findByRole("button", {
			name: "Enrollment Closed",
		});
		expect(button).toBeDisabled();
	});
});
