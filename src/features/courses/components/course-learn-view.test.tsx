import { QueryClientProvider } from "@tanstack/react-query";
import {
	createMemoryHistory,
	createRootRoute,
	createRoute,
	createRouter,
	RouterProvider,
} from "@tanstack/react-router";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetEnrollmentMockState } from "@/mocks/enrollments.handlers";
import { signInForTest } from "@/test/auth";
import { server } from "@/test/mocks/server";
import { createTestQueryClient } from "@/test/render";
import type { CourseBlock } from "../types/course-block.types";
import {
	CourseLearnView,
	type CourseLearnViewProps,
} from "./course-learn-view";

let cleanupAuth: (() => void) | null = null;

function renderCourseLearnView(props: CourseLearnViewProps) {
	const queryClient = createTestQueryClient();
	const rootRoute = createRootRoute();
	const myCoursesRoute = createRoute({
		getParentRoute: () => rootRoute,
		path: "/my-courses",
		component: () => <div>My Courses page</div>,
	});
	const courseDetailRoute = createRoute({
		getParentRoute: () => rootRoute,
		path: "/courses/$courseId",
		component: () => <div>Course overview page</div>,
	});
	const learnRoute = createRoute({
		getParentRoute: () => rootRoute,
		path: "/courses/$courseId/learn",
		component: () => <CourseLearnView {...props} />,
	});

	const router = createRouter({
		routeTree: rootRoute.addChildren([
			myCoursesRoute,
			courseDetailRoute,
			learnRoute,
		]),
		history: createMemoryHistory({
			initialEntries: [`/courses/${props.courseId}/learn`],
		}),
	});

	return {
		user: userEvent.setup(),
		...render(
			<QueryClientProvider client={queryClient}>
				<RouterProvider router={router} />
			</QueryClientProvider>,
		),
	};
}

describe("CourseLearnView", () => {
	beforeEach(() => {
		resetEnrollmentMockState();
		cleanupAuth = signInForTest("student-1", "STUDENT");
	});

	afterEach(() => {
		cleanupAuth?.();
		cleanupAuth = null;
	});

	it("renders outline, plays quiz block, and updates both quiz score and course progress live after submit", async () => {
		const { user } = renderCourseLearnView({ courseId: "course-intro-cs" });

		expect(
			await screen.findByRole("heading", {
				level: 1,
				name: "Introduction to Computer Science",
			}),
		).toBeInTheDocument();

		const progressRegion = screen.getByRole("region", {
			name: "Course progress",
		});
		expect(
			within(progressRegion).getByText("60% (6/10 items)"),
		).toBeInTheDocument();
		expect(
			within(progressRegion).getByText("66% (2/3 quizzes)"),
		).toBeInTheDocument();
		expect(
			within(progressRegion).getByRole("progressbar", {
				name: "Learning progress",
			}),
		).toHaveAttribute("aria-valuenow", "60");

		expect(
			screen.getByRole("heading", {
				level: 2,
				name: "Introduction to Operating System Abstractions",
			}),
		).toBeInTheDocument();

		await user.click(
			screen.getByRole("button", { name: /System Call Knowledge Check/i }),
		);

		expect(
			await screen.findByRole("heading", {
				level: 2,
				name: "System Call Knowledge Check",
			}),
		).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: "Start quiz" }));
		await user.click(screen.getByRole("radio", { name: "fork()" }));
		await user.click(
			screen.getByRole("checkbox", {
				name: "Executing a system call trap instruction",
			}),
		);
		await user.click(
			screen.getByRole("checkbox", { name: "A hardware timer interrupt" }),
		);
		await user.click(
			screen.getByRole("checkbox", { name: "A page fault exception" }),
		);
		await user.click(screen.getByRole("radio", { name: "False" }));
		await user.type(
			screen.getByRole("textbox", { name: /cpu execution mode/i }),
			"kernel mode",
		);

		await user.click(screen.getByRole("button", { name: "Review & submit" }));
		await user.click(
			within(screen.getByRole("dialog")).getByRole("button", {
				name: "Submit quiz",
			}),
		);

		expect(await screen.findByText("Score: 100%")).toBeInTheDocument();

		await waitFor(() => {
			expect(
				within(progressRegion).getByText("70% (7/10 items)"),
			).toBeInTheDocument();
			expect(
				within(progressRegion).getByText("100% (3/3 quizzes)"),
			).toBeInTheDocument();
			expect(
				within(progressRegion).getByRole("progressbar", {
					name: "Learning progress",
				}),
			).toHaveAttribute("aria-valuenow", "70");
			expect(
				within(progressRegion).getByRole("progressbar", {
					name: "Quiz completion",
				}),
			).toHaveAttribute("aria-valuenow", "100");
		});
	});

	it("renders root-level standalone quiz blocks from a flat blocks array and supports lesson navigation", async () => {
		const flatBlocks: CourseBlock[] = [
			{
				id: "mod-flat",
				courseId: "course-intro-cs",
				type: "MODULE",
				title: "Module 1: Flat Structure",
				parentModuleId: null,
				position: 1,
				content: null,
			},
			{
				id: "lesson-flat",
				courseId: "course-intro-cs",
				type: "TEXT",
				title: "Flat Module Lesson",
				parentModuleId: "mod-flat",
				position: 1,
				content: { text: "Structured flat lesson text." },
			},
			{
				id: "quiz-released",
				courseId: "course-intro-cs",
				type: "QUIZ",
				title: "Standalone Midterm Quiz",
				parentModuleId: null,
				position: 2,
				content: null,
			},
		];

		server.use(
			http.get("*/api/courses/course-intro-cs/blocks", () => {
				return HttpResponse.json(flatBlocks);
			}),
		);

		const { user } = renderCourseLearnView({ courseId: "course-intro-cs" });

		expect(
			await screen.findByRole("heading", {
				level: 2,
				name: "Flat Module Lesson",
			}),
		).toBeInTheDocument();
		expect(
			screen.getByText("Structured flat lesson text."),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /Standalone Midterm Quiz/i }),
		).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: "Next lesson" }));

		expect(
			await screen.findByRole("heading", {
				level: 2,
				name: "Released Quiz Assessment",
			}),
		).toBeInTheDocument();
	});

	it("renders access restricted state cleanly when course blocks return 403", async () => {
		server.use(
			http.get("*/api/courses/course-intro-cs/blocks", () => {
				return HttpResponse.json(
					{ message: "You are not enrolled in this course." },
					{ status: 403 },
				);
			}),
		);

		renderCourseLearnView({ courseId: "course-intro-cs" });

		expect(
			await screen.findByRole("heading", {
				level: 1,
				name: "Course Access Restricted",
			}),
		).toBeInTheDocument();
		expect(
			screen.getByText("You are not enrolled in this course."),
		).toBeInTheDocument();
		expect(
			screen.queryByRole("navigation", { name: "Course syllabus" }),
		).not.toBeInTheDocument();
	});

	it("shows resume position indicator when deep-linking to a video block", async () => {
		renderCourseLearnView({
			courseId: "course-intro-cs",
			initialBlockId: "block-1-2",
			positionSeconds: 142,
		});

		expect(
			await screen.findByRole("heading", {
				level: 2,
				name: "User Mode vs. Kernel Mode Traps",
			}),
		).toBeInTheDocument();
		expect(screen.getByText("Resume at 2:22 (142s)")).toBeInTheDocument();
	});
});
