import { QueryClientProvider } from "@tanstack/react-query";
import {
	createMemoryHistory,
	createRootRoute,
	createRoute,
	createRouter,
	RouterProvider,
} from "@tanstack/react-router";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import {
	afterAll,
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import { setAccessToken } from "@/lib/auth/access-token";
import { installAuthInterceptors } from "@/lib/http/auth-interceptors";
import { createMockAccessToken, resetMockAuth } from "@/mocks/auth.handlers";
import { mockDraftCourse, mockSuspendedCourse } from "@/mocks/courses.fixtures";
import { resetEnrollmentMockState } from "@/mocks/enrollments.handlers";
import { useAuthStore } from "@/stores/auth.store";
import { server } from "@/test/mocks/server";
import { createTestQueryClient } from "@/test/render";
import { CatalogView } from "./catalog-view";
import { CourseDetailView } from "./course-detail-view";

function renderCourseRoutes(initialEntry: string) {
	const queryClient = createTestQueryClient();
	const rootRoute = createRootRoute();
	const catalogRoute = createRoute({
		getParentRoute: () => rootRoute,
		path: "/catalog",
		component: () => <CatalogView searchParams={{ page: 1, limit: 12 }} />,
	});
	const detailRoute = createRoute({
		getParentRoute: () => rootRoute,
		path: "/courses/$courseId",
		component: function CourseDetailRoute() {
			const { courseId } = detailRoute.useParams();
			return <CourseDetailView courseId={courseId} />;
		},
	});

	const router = createRouter({
		routeTree: rootRoute.addChildren([catalogRoute, detailRoute]),
		history: createMemoryHistory({
			initialEntries: [initialEntry],
		}),
	});

	render(
		<QueryClientProvider client={queryClient}>
			<RouterProvider router={router} />
		</QueryClientProvider>,
	);

	return { router };
}

function renderDetailView(courseId: string) {
	return renderCourseRoutes(`/courses/${courseId}`);
}

describe("CourseDetailView", () => {
	let uninstallInterceptors: (() => void) | undefined;

	beforeAll(() => {
		uninstallInterceptors = installAuthInterceptors();
	});

	beforeEach(() => {
		resetMockAuth();
		resetEnrollmentMockState();
		setAccessToken(null);
		useAuthStore.getState().setUser(null);
	});

	afterEach(() => {
		resetMockAuth();
		resetEnrollmentMockState();
		setAccessToken(null);
		useAuthStore.getState().reset();
	});

	afterAll(() => {
		uninstallInterceptors?.();
	});

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
		expect(screen.getByText("7 learning items")).toBeInTheDocument();
	});

	it("renders syllabus error state with retry button when outline query fails", async () => {
		server.use(
			http.get("*/api/courses/course-os/outline", () => {
				return new HttpResponse(null, { status: 500 });
			}),
		);

		renderDetailView("course-os");

		expect(
			await screen.findByRole("heading", {
				level: 1,
				name: "Operating Systems",
			}),
		).toBeInTheDocument();

		expect(
			await screen.findByText("Failed to load course syllabus."),
		).toBeInTheDocument();

		expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
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
			http.get(`*/api/courses/${mockDraftCourse.id}`, () => {
				return HttpResponse.json(mockDraftCourse);
			}),
		);

		renderDetailView(mockDraftCourse.id);

		expect(
			await screen.findByRole("heading", {
				level: 1,
				name: "Course Not Found",
			}),
		).toBeInTheDocument();
		expect(screen.queryByText(mockDraftCourse.title)).not.toBeInTheDocument();
	});

	it("contains suspended course by displaying not found state", async () => {
		server.use(
			http.get("*/api/courses/course-suspended", () => {
				return HttpResponse.json(mockSuspendedCourse);
			}),
		);

		renderDetailView("course-suspended");

		expect(
			await screen.findByRole("heading", {
				level: 1,
				name: "Course Not Found",
			}),
		).toBeInTheDocument();
		expect(
			screen.queryByText(mockSuspendedCourse.title),
		).not.toBeInTheDocument();
	});

	it("allows a signed-out visitor to open a course from /catalog and view its syllabus outline without calling /blocks", async () => {
		const user = userEvent.setup();
		const blocksRequests = vi.fn();
		server.use(
			http.get("*/api/courses/*/blocks", ({ request }) => {
				blocksRequests(request.url);
				return new HttpResponse(null, { status: 401 });
			}),
		);

		const { router } = renderCourseRoutes("/catalog");

		const courseLink = await screen.findByRole("link", {
			name: /Operating Systems/,
		});
		await user.click(courseLink);

		await waitFor(() => {
			expect(router.state.location.pathname).toBe("/courses/course-os");
		});

		expect(
			await screen.findByRole("heading", {
				level: 2,
				name: "Course Syllabus",
			}),
		).toBeInTheDocument();
		expect(
			await screen.findByText("Module 1: Kernel Architecture & System Calls"),
		).toBeInTheDocument();
		expect(
			screen.getByText("Introduction to Operating System Abstractions"),
		).toBeInTheDocument();
		expect(
			await screen.findByRole("link", { name: "Log in to enroll" }),
		).toBeInTheDocument();
		expect(blocksRequests).not.toHaveBeenCalled();
	});

	it("renders Enroll in Course CTA and syllabus outline for signed-in unenrolled student when /blocks returns 403", async () => {
		setAccessToken(createMockAccessToken("st-1", "STUDENT"));
		useAuthStore.getState().setUser({
			id: "st-1",
			email: "st@test.com",
			name: "Student",
			role: "student",
		});

		const blocksRequests = vi.fn();
		server.use(
			http.get("*/api/courses/course-os/blocks", ({ request }) => {
				blocksRequests(request.url);
				return HttpResponse.json({ message: "Forbidden" }, { status: 403 });
			}),
		);

		renderDetailView("course-os");

		expect(
			await screen.findByRole("button", { name: "Enroll in Course" }),
		).toBeInTheDocument();
		expect(
			await screen.findByText("Module 1: Kernel Architecture & System Calls"),
		).toBeInTheDocument();
		expect(
			screen.getByText("Introduction to Operating System Abstractions"),
		).toBeInTheDocument();
		expect(blocksRequests).not.toHaveBeenCalled();
	});
});
