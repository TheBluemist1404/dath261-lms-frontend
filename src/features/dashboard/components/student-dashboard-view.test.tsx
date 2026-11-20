import {
	createMemoryHistory,
	createRootRoute,
	createRoute,
	createRouter,
	RouterProvider,
} from "@tanstack/react-router";
import { screen, waitFor, within } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { workspaceHandlers } from "@/features/workspace/testing/handlers";
import { mockUsers, resetMockDb } from "@/features/workspace/testing/mock-db";
import {
	createMockUpcomingDeadlines,
	mockMyCoursesItems,
	mockMyCoursesList,
} from "@/mocks/enrollments.fixtures";
import { useAuthStore } from "@/stores/auth.store";
import { signInForTest } from "@/test/auth";
import { server } from "@/test/mocks/server";
import { renderWithProviders } from "@/test/render";
import { StudentDashboardView } from "./student-dashboard-view";

function renderDashboard() {
	const rootRoute = createRootRoute();
	const indexRoute = createRoute({
		getParentRoute: () => rootRoute,
		path: "/",
		component: StudentDashboardView,
	});
	const router = createRouter({
		routeTree: rootRoute.addChildren([indexRoute]),
		history: createMemoryHistory({ initialEntries: ["/"] }),
	});

	return renderWithProviders(<RouterProvider router={router} />);
}

function setSignedInUserName(name: string) {
	const current = useAuthStore.getState().user;
	if (!current) {
		throw new Error("Expected authenticated user in store");
	}
	useAuthStore.getState().setUser({ ...current, name });
}

describe("StudentDashboardView", () => {
	let signOut: () => void = () => {};

	beforeEach(() => {
		resetMockDb();
		server.use(...workspaceHandlers);
		signOut = signInForTest(mockUsers.alex.id);
		setSignedInUserName("Alex Learner");
	});

	afterEach(() => {
		signOut();
	});

	it("renders loaded dashboard sections with resume hero, courses, sorted deadlines, recent pages, and unavailable notice", async () => {
		renderDashboard();

		const greeting = await screen.findByRole("heading", {
			level: 1,
			name: /^Good (morning|afternoon|evening), Alex\.$/,
		});
		expect(greeting).toBeInTheDocument();
		expect(
			screen.getByText("A little progress, a clearer understanding."),
		).toBeInTheDocument();

		const continueSection = await screen.findByRole("region", {
			name: "Continue learning",
		});
		expect(
			await within(continueSection).findByRole("heading", {
				level: 2,
				name: "Lecture 1: Computational Thinking",
			}),
		).toBeInTheDocument();
		expect(
			within(continueSection).getAllByText("Introduction to Computer Science"),
		).toHaveLength(2);
		expect(await within(continueSection).findByText("60%")).toBeInTheDocument();
		const progressbar = within(continueSection).getByRole("progressbar", {
			name: "Learning progress for Introduction to Computer Science",
		});
		expect(progressbar).toHaveAttribute("aria-valuenow", "60");
		expect(
			within(continueSection).getByRole("link", { name: "Resume learning" }),
		).toHaveAttribute(
			"href",
			"/courses/course-intro-cs/learn?blockId=block-video-1&positionSeconds=142",
		);
		expect(
			within(continueSection).getByRole("link", { name: "Study notes" }),
		).toHaveAttribute("href", "/workspace");

		const coursesSection = screen.getByRole("region", { name: "Your courses" });
		expect(
			within(coursesSection).getByRole("link", { name: "View all courses" }),
		).toHaveAttribute("href", "/my-courses?page=1");
		expect(
			within(coursesSection).getByText("Introduction to Computer Science"),
		).toBeInTheDocument();
		expect(
			within(coursesSection).queryByText("Data Structures & Algorithms"),
		).not.toBeInTheDocument();

		const comingUpSection = screen.getByRole("region", { name: "Coming up" });
		const deadlineLinks = await within(comingUpSection).findAllByRole("link");
		expect(deadlineLinks).toHaveLength(2);
		expect(deadlineLinks[0]).toHaveTextContent("System Call Knowledge Check");
		expect(deadlineLinks[0]).toHaveTextContent("Attempts: 0/3");
		expect(deadlineLinks[0]).not.toHaveTextContent("Late allowed");
		expect(deadlineLinks[0]).toHaveAttribute(
			"href",
			"/courses/course-intro-cs/learn?blockId=block-1-3",
		);
		expect(deadlineLinks[1]).toHaveTextContent("Process Scheduling Quiz");
		expect(deadlineLinks[1]).toHaveTextContent("Attempts: 1/3");
		expect(deadlineLinks[1]).toHaveTextContent("Late allowed");
		expect(deadlineLinks[1]).toHaveAttribute(
			"href",
			"/courses/course-intro-cs/learn?blockId=block-2-1",
		);
		expect(
			within(comingUpSection).queryByText("Virtual Memory Quiz"),
		).not.toBeInTheDocument();

		const recentSection = screen.getByRole("region", { name: "Recent pages" });
		const processPageLink = await within(recentSection).findByRole("link", {
			name: /Understanding processes/,
		});
		expect(processPageLink).toHaveTextContent("My personal workspace");
		expect(processPageLink).toHaveAttribute(
			"href",
			"/workspace/ws-personal-alex/pages/page-processes",
		);
		expect(
			within(recentSection).getByRole("link", { name: /Processes/ }),
		).toHaveAttribute(
			"href",
			"/workspace/ws-systems-study-group/pages/page-group-processes",
		);
		expect(
			within(recentSection).getByRole("link", { name: /Reading list/ }),
		).toHaveAttribute(
			"href",
			"/workspace/ws-research-journal/pages/page-sources",
		);

		expect(screen.getByText("One course is unavailable")).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: "View unavailable courses" }),
		).toHaveAttribute("href", "/my-courses?page=1&state=UNAVAILABLE");
	});

	it("falls back to Welcome back greeting when name is empty and hides unavailable notice when none are unavailable", async () => {
		setSignedInUserName("");
		const activeOnly = mockMyCoursesItems.filter(
			(item) => item.state === "IN_PROGRESS",
		);
		server.use(
			http.get("*/api/users/me/enrollments", () =>
				HttpResponse.json({
					...mockMyCoursesList,
					data: activeOnly,
					meta: { ...mockMyCoursesList.meta, total: activeOnly.length },
				}),
			),
		);

		renderDashboard();

		expect(
			await screen.findByRole("heading", { level: 1, name: "Welcome back." }),
		).toBeInTheDocument();
		expect(
			await screen.findByRole("region", { name: "Continue learning" }),
		).toBeInTheDocument();
		expect(
			screen.queryByRole("link", { name: "View unavailable courses" }),
		).not.toBeInTheDocument();
	});

	it("falls back to course title when no resume position exists", async () => {
		let resumeCalled = false;
		server.use(
			http.get("*/api/courses/:courseId/progress/resume", () => {
				resumeCalled = true;
				return HttpResponse.json({
					hasResumePosition: false,
					lastVisitedAt: null,
					block: null,
					resumeData: null,
				});
			}),
		);

		renderDashboard();

		const continueSection = await screen.findByRole("region", {
			name: "Continue learning",
		});
		await waitFor(() => expect(resumeCalled).toBe(true));
		expect(await within(continueSection).findByText("60%")).toBeInTheDocument();
		expect(
			within(continueSection).getByText("Pick up where you left off."),
		).toBeInTheDocument();
		expect(
			within(continueSection).getByRole("heading", {
				level: 2,
				name: "Introduction to Computer Science",
			}),
		).toBeInTheDocument();
		expect(
			within(continueSection).getByRole("link", { name: "Resume learning" }),
		).toHaveAttribute("href", "/courses/course-intro-cs/learn");
	});

	it("shows No attempts left badge when attempts are exhausted and empty copy when no deadlines exist", async () => {
		const exhausted = createMockUpcomingDeadlines()[0];
		server.use(
			http.get("*/api/users/me/deadlines", () =>
				HttpResponse.json([
					{
						...exhausted,
						attemptsUsed: 3,
						maxAttempts: 3,
					},
				]),
			),
		);

		renderDashboard();

		const comingUpSection = await screen.findByRole("region", {
			name: "Coming up",
		});
		expect(
			await within(comingUpSection).findByText("No attempts left"),
		).toBeInTheDocument();
		expect(
			within(comingUpSection).getByText("Attempts: 3/3"),
		).toBeInTheDocument();
	});

	it("shows calm deadlines empty state when no deadlines are due in 14 days", async () => {
		server.use(
			http.get("*/api/users/me/deadlines", () => HttpResponse.json([])),
		);

		renderDashboard();

		const comingUpSection = await screen.findByRole("region", {
			name: "Coming up",
		});
		expect(
			await within(comingUpSection).findByText(
				"No deadlines due in the next 14 days.",
			),
		).toBeInTheDocument();
	});

	it("renders empty state with catalog and workspace links when learner has no enrollments", async () => {
		server.use(
			http.get("*/api/users/me/enrollments", () =>
				HttpResponse.json({
					...mockMyCoursesList,
					data: [],
					meta: { ...mockMyCoursesList.meta, total: 0 },
				}),
			),
			http.get("*/api/users/me/deadlines", () => HttpResponse.json([])),
		);

		renderDashboard();

		expect(
			await screen.findByRole("heading", {
				level: 2,
				name: "Your learning journey starts here.",
			}),
		).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: "Explore courses" }),
		).toHaveAttribute("href", "/catalog");
		expect(
			screen.getByRole("link", { name: /Your private workspace is ready/ }),
		).toHaveAttribute("href", "/workspace");
	});

	it("shows alert and recovers when enrollments request fails then succeeds on retry", async () => {
		server.use(
			http.get(
				"*/api/users/me/enrollments",
				() =>
					HttpResponse.json(
						{ message: "Could not load enrollments." },
						{ status: 500 },
					),
				{ once: true },
			),
		);

		const { user } = renderDashboard();

		const alert = await screen.findByRole("alert");
		expect(alert).toHaveTextContent("Could not load enrollments.");

		await user.click(within(alert).getByRole("button", { name: "Try again" }));

		const continueSection = await screen.findByRole("region", {
			name: "Continue learning",
		});
		expect(
			await within(continueSection).findByRole("heading", {
				level: 2,
				name: "Lecture 1: Computational Thinking",
			}),
		).toBeInTheDocument();
	});

	it("shows alert inside Coming up and recovers sorted deadlines on retry", async () => {
		server.use(
			http.get(
				"*/api/users/me/deadlines",
				() =>
					HttpResponse.json(
						{ message: "Deadlines service unavailable." },
						{ status: 500 },
					),
				{ once: true },
			),
		);

		const { user } = renderDashboard();

		const comingUpSection = await screen.findByRole("region", {
			name: "Coming up",
		});
		const alert = await within(comingUpSection).findByRole("alert");
		expect(alert).toHaveTextContent("Deadlines service unavailable.");

		expect(
			await screen.findByRole("region", { name: "Continue learning" }),
		).toBeInTheDocument();

		await user.click(within(alert).getByRole("button", { name: "Try again" }));

		const deadlineLinks = await within(comingUpSection).findAllByRole("link");
		expect(deadlineLinks).toHaveLength(2);
		expect(deadlineLinks[0]).toHaveTextContent("System Call Knowledge Check");
		expect(deadlineLinks[1]).toHaveTextContent("Process Scheduling Quiz");
	});

	it("renders completed courses when no in-progress courses exist and omits Continue learning", async () => {
		const completedOnly = mockMyCoursesItems.filter(
			(item) => item.state === "COMPLETED",
		);
		server.use(
			http.get("*/api/users/me/enrollments", () =>
				HttpResponse.json({
					...mockMyCoursesList,
					data: completedOnly,
					meta: { ...mockMyCoursesList.meta, total: completedOnly.length },
				}),
			),
		);

		renderDashboard();

		const coursesSection = await screen.findByRole("region", {
			name: "Your courses",
		});
		expect(
			within(coursesSection).getByText("Data Structures & Algorithms"),
		).toBeInTheDocument();
		expect(
			screen.queryByRole("region", { name: "Continue learning" }),
		).not.toBeInTheDocument();
	});
});
