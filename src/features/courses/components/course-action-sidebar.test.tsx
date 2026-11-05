import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
	createMemoryHistory,
	createRootRoute,
	createRoute,
	createRouter,
	RouterProvider,
} from "@tanstack/react-router";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { setAccessToken } from "@/lib/auth/access-token";
import { installAuthInterceptors } from "@/lib/http/auth-interceptors";
import { createMockAccessToken } from "@/mocks/auth.handlers";
import { resetEnrollmentMockState } from "@/mocks/enrollments.handlers";
import { useAuthStore } from "@/stores/auth.store";
import { enrollmentKeys } from "../api/enrollment.queries";
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

function renderSidebar(
	course: Course,
	qc = new QueryClient({
		defaultOptions: {
			queries: { retry: false, staleTime: Number.POSITIVE_INFINITY },
			mutations: { retry: false },
		},
	}),
) {
	const root = createRootRoute();
	const index = createRoute({
		getParentRoute: () => root,
		path: "/",
		component: () => <CourseActionSidebar course={course} />,
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

function setStudent(status: "ACTIVE" | "COMPLETED" | "LEFT" | null = null) {
	setAccessToken(createMockAccessToken("st-1", "STUDENT"));
	useAuthStore.getState().setUser({
		id: "st-1",
		email: "st@test.com",
		name: "Student",
		role: "student",
	});
	const qc = new QueryClient({
		defaultOptions: {
			queries: { retry: false, staleTime: Number.POSITIVE_INFINITY },
			mutations: { retry: false },
		},
	});
	if (status) {
		qc.setQueryData(enrollmentKeys.course("course-os"), {
			courseId: "course-os",
			enrollmentId: "e-1",
			enrollmentStatus: status,
			courseAvailable: true,
			canAccessCourse: status !== "LEFT",
		});
	}
	return qc;
}

describe("CourseActionSidebar", () => {
	beforeAll(() => {
		installAuthInterceptors();
	});

	beforeEach(() => {
		resetEnrollmentMockState();
		setAccessToken(null);
		useAuthStore.getState().setUser(null);
	});

	it("renders login call to action for unauthenticated visitors", async () => {
		renderSidebar(sampleCourse);
		await waitFor(() => {
			expect(
				screen.getByRole("link", { name: "Log in to enroll" }),
			).toBeInTheDocument();
		});
	});

	it("renders disabled instructor preview for faculty and admin roles", async () => {
		useAuthStore.getState().setUser({
			id: "lec-1",
			email: "lec@test.com",
			name: "Lecturer",
			role: "lecturer",
		});
		renderSidebar(sampleCourse);
		expect(
			await screen.findByRole("button", { name: "Instructor Preview" }),
		).toBeDisabled();
	});

	it("renders continue learning CTA for active student even when enrollment window closed", async () => {
		const qc = setStudent("ACTIVE");
		renderSidebar(
			{ ...sampleCourse, enrollmentEndAt: "2020-01-01T00:00:00Z" },
			qc,
		);
		expect(
			await screen.findByRole("link", { name: "Continue learning" }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Leave course" }),
		).toBeInTheDocument();
	});

	it("renders review course CTA for completed student even when enrollment window closed", async () => {
		const qc = setStudent("COMPLETED");
		renderSidebar(
			{ ...sampleCourse, enrollmentEndAt: "2020-01-01T00:00:00Z" },
			qc,
		);
		expect(
			await screen.findByRole("link", { name: "Review course" }),
		).toBeInTheDocument();
	});

	it("renders disabled button when enrollment window has passed for unenrolled student", async () => {
		setStudent();
		renderSidebar({ ...sampleCourse, enrollmentEndAt: "2020-01-01T00:00:00Z" });
		expect(
			await screen.findByRole("button", { name: "Enrollment Closed" }),
		).toBeDisabled();
	});

	it("renders re-enroll button with progress restoration note when student previously left", async () => {
		const qc = setStudent("LEFT");
		renderSidebar(sampleCourse, qc);
		expect(
			await screen.findByRole("button", {
				name: "Re-enroll and restore history",
			}),
		).toBeInTheDocument();
	});

	it("executes enroll mutation when unenrolled student clicks enroll", async () => {
		const qc = setStudent();
		const user = userEvent.setup();
		renderSidebar(sampleCourse, qc);
		await user.click(
			await screen.findByRole("button", { name: "Enroll in Course" }),
		);
		await waitFor(() => {
			expect(
				screen.getByRole("link", { name: "Continue learning" }),
			).toBeInTheDocument();
		});
	});

	it("opens leave dialog and executes leave mutation on confirmation", async () => {
		const qc = setStudent("ACTIVE");
		const user = userEvent.setup();
		renderSidebar(sampleCourse, qc);
		await user.click(
			await screen.findByRole("button", { name: "Leave course" }),
		);
		expect(screen.getByText("Leave this course?")).toBeInTheDocument();
		await user.click(screen.getByRole("button", { name: "Leave Course" }));
		await waitFor(() => {
			expect(
				screen.getByRole("button", { name: "Re-enroll and restore history" }),
			).toBeInTheDocument();
		});
	});
});
