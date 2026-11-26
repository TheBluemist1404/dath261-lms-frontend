import {
	createMemoryHistory,
	createRootRoute,
	createRoute,
	createRouter,
	Outlet,
	RouterProvider,
} from "@tanstack/react-router";
import { screen, waitFor, within } from "@testing-library/react";
import { delay, HttpResponse, http } from "msw";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	getMockNotifications,
	resetNotificationMockState,
	setMockNotifications,
} from "@/mocks/notifications.fixtures";
import { signInForTest } from "@/test/auth";
import { server } from "@/test/mocks/server";
import { renderWithProviders } from "@/test/render";
import {
	latestNotificationsQuery,
	UNREAD_REFETCH_INTERVAL_MS,
} from "../api/notification.queries";
import type { AppNotification } from "../types";
import {
	formatUnreadBadge,
	getNotificationTarget,
} from "../utils/notification-target";
import { NotificationBell } from "./notification-bell";
import { NotificationsPage, type NotificationTab } from "./notifications-page";

function renderApp(initialPath = "/") {
	const rootRoute = createRootRoute({
		component: () => (
			<>
				<NotificationBell />
				<Outlet />
			</>
		),
	});
	const homeRoute = createRoute({
		getParentRoute: () => rootRoute,
		path: "/",
		component: () => <p>Home</p>,
	});
	const learnRoute = createRoute({
		getParentRoute: () => rootRoute,
		path: "/courses/$courseId/learn",
		component: () => <p>Course reader</p>,
	});
	const notificationsRoute = createRoute({
		getParentRoute: () => rootRoute,
		path: "/notifications",
		component: () => <p>All notifications</p>,
	});
	const router = createRouter({
		routeTree: rootRoute.addChildren([
			homeRoute,
			learnRoute,
			notificationsRoute,
		]),
		history: createMemoryHistory({ initialEntries: [initialPath] }),
	});
	return { router, ...renderWithProviders(<RouterProvider router={router} />) };
}

function renderPage(tab: NotificationTab = "all", page = 1) {
	const rootRoute = createRootRoute({ component: Outlet });
	const pageRoute = createRoute({
		getParentRoute: () => rootRoute,
		path: "/",
		component: () => (
			<NotificationsPage tab={tab} page={page} onChange={() => {}} />
		),
	});
	const learnRoute = createRoute({
		getParentRoute: () => rootRoute,
		path: "/courses/$courseId/learn",
		component: () => <p>Course reader</p>,
	});
	const router = createRouter({
		routeTree: rootRoute.addChildren([pageRoute, learnRoute]),
		history: createMemoryHistory({ initialEntries: ["/"] }),
	});
	return { router, ...renderWithProviders(<RouterProvider router={router} />) };
}

function recordRequests() {
	const log: string[] = [];
	server.events.on("request:start", ({ request }) => {
		const url = new URL(request.url);
		log.push(`${request.method} ${url.pathname}${url.search}`);
	});
	return log;
}

function makeRows(count: number): AppNotification[] {
	return Array.from({ length: count }, (_, index) => ({
		id: `n-${index}`,
		type: "NEW_CONTENT",
		title: `Update ${index}`,
		message: "New material.",
		targetType: "COURSE",
		targetId: "course-os",
		courseId: "course-os",
		readAt: null,
		createdAt: "2026-11-25T09:00:00.000Z",
	}));
}

describe("notification helpers", () => {
	it("formats the unread badge: hidden at 0, 9+ above 9", () => {
		expect(formatUnreadBadge(0)).toBeNull();
		expect(formatUnreadBadge(3)).toBe("3");
		expect(formatUnreadBadge(9)).toBe("9");
		expect(formatUnreadBadge(10)).toBe("9+");
	});

	it("maps NEW_CONTENT to the reader and RESULT_RELEASED to the quiz block", () => {
		const [newContent, result] = getMockNotifications();
		expect(getNotificationTarget(newContent)).toEqual({
			courseId: "course-os",
		});
		expect(getNotificationTarget(result)).toEqual({
			courseId: "course-os",
			blockId: "block-1-3",
		});
		expect(getNotificationTarget({ ...newContent, courseId: null })).toBeNull();
	});

	it("refetches the count every 60 s and on window focus", () => {
		const options = latestNotificationsQuery();
		expect(UNREAD_REFETCH_INTERVAL_MS).toBe(60_000);
		expect(options.refetchInterval).toBe(60_000);
		expect(options.refetchOnWindowFocus).toBe(true);
	});
});

describe("NotificationBell", () => {
	let signOut: () => void = () => {};

	beforeEach(() => {
		resetNotificationMockState();
		signOut = signInForTest("student-1");
	});

	afterEach(() => {
		signOut();
		server.events.removeAllListeners();
	});

	it("shows the unread count from meta.unreadCount", async () => {
		renderApp();
		expect(
			await screen.findByRole("button", { name: "Notifications, 2 unread" }),
		).toBeInTheDocument();
		expect(screen.getByTestId("notification-badge")).toHaveTextContent("2");
	});

	it("hides the badge at 0 and shows 9+ above 9", async () => {
		setMockNotifications(makeRows(12));
		const first = renderApp();
		expect(await screen.findByTestId("notification-badge")).toHaveTextContent(
			"9+",
		);
		first.unmount();

		setMockNotifications([]);
		renderApp();
		await screen.findByText("Home");
		await waitFor(() =>
			expect(
				screen.getByRole("button", { name: "Notifications" }),
			).toBeInTheDocument(),
		);
		expect(screen.queryByTestId("notification-badge")).not.toBeInTheDocument();
	});

	it("lists the latest 10 with unread ones marked", async () => {
		const log = recordRequests();
		const { user } = renderApp();
		await user.click(
			await screen.findByRole("button", { name: "Notifications, 2 unread" }),
		);

		const panel = screen.getByRole("dialog", { name: "Notifications" });
		const items = await within(panel).findAllByRole("listitem");
		expect(items).toHaveLength(3);
		expect(within(panel).getAllByTestId("unread-dot")).toHaveLength(2);
		expect(log).toContain("GET /api/users/me/notifications?page=1&limit=10");
	});

	it("marks one read, updates the badge and opens the course reader", async () => {
		const log = recordRequests();
		const { user, router } = renderApp();
		await user.click(
			await screen.findByRole("button", { name: "Notifications, 2 unread" }),
		);
		await user.click(
			await screen.findByRole("button", {
				name: /New content in Operating Systems/,
			}),
		);

		await screen.findByText("Course reader");
		expect(router.state.location.pathname).toBe("/courses/course-os/learn");
		expect(log).toContain("PATCH /api/users/me/notifications/notif-1/read");
		expect(
			await screen.findByRole("button", { name: "Notifications, 1 unread" }),
		).toBeInTheDocument();
	});

	it("opens the quiz block for a released result", async () => {
		const { user, router } = renderApp();
		await user.click(
			await screen.findByRole("button", { name: "Notifications, 2 unread" }),
		);
		await user.click(
			await screen.findByRole("button", {
				name: /Results released in Operating Systems/,
			}),
		);

		await screen.findByText("Course reader");
		expect(router.state.location.pathname).toBe("/courses/course-os/learn");
		expect(router.state.location.search).toEqual({ blockId: "block-1-3" });
	});

	it("marks all as read and hides the badge without a reload", async () => {
		const log = recordRequests();
		const { user } = renderApp();
		await user.click(
			await screen.findByRole("button", { name: "Notifications, 2 unread" }),
		);
		await user.click(screen.getByRole("button", { name: "Mark all as read" }));

		expect(
			await screen.findByRole("button", { name: "Notifications" }),
		).toBeInTheDocument();
		expect(screen.queryByTestId("notification-badge")).not.toBeInTheDocument();
		expect(log).toContain("PATCH /api/users/me/notifications/read-all");
	});

	it("shows the empty state", async () => {
		setMockNotifications([]);
		const { user } = renderApp();
		await screen.findByText("Home");
		await user.click(screen.getByRole("button", { name: "Notifications" }));
		expect(
			await screen.findByText("No notifications yet."),
		).toBeInTheDocument();
	});

	it("shows an error with Retry, then recovers", async () => {
		server.use(
			http.get(
				"*/api/users/me/notifications",
				() => HttpResponse.json({ message: "Boom" }, { status: 500 }),
				{ once: true },
			),
		);
		const { user } = renderApp();
		await user.click(
			await screen.findByRole("button", { name: "Notifications" }),
		);
		const alert = await screen.findByRole("alert");
		expect(alert).toHaveTextContent("We could not load notifications.");

		await user.click(within(alert).getByRole("button", { name: "Retry" }));
		expect(
			await screen.findByRole("button", {
				name: /New content in Operating Systems/,
			}),
		).toBeInTheDocument();
	});

	it("closes the dropdown with Escape", async () => {
		const { user } = renderApp();
		await user.click(
			await screen.findByRole("button", { name: "Notifications, 2 unread" }),
		);
		expect(screen.getByRole("dialog")).toBeInTheDocument();
		await user.keyboard("{Escape}");
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
	});
});

describe("NotificationsPage", () => {
	let signOut: () => void = () => {};

	beforeEach(() => {
		resetNotificationMockState();
		signOut = signInForTest("student-1");
	});

	afterEach(() => {
		signOut();
		server.events.removeAllListeners();
	});

	it("renders the SL-08 header, tabs and list", async () => {
		renderPage();
		expect(
			await screen.findByRole("heading", { level: 1, name: "Notifications" }),
		).toBeInTheDocument();
		expect(
			screen.getByText(
				"Updates that help you continue learning and collaborating.",
			),
		).toBeInTheDocument();
		expect(screen.getByRole("tab", { name: "All" })).toHaveAttribute(
			"aria-selected",
			"true",
		);
		expect(await screen.findAllByRole("listitem")).toHaveLength(3);
	});

	it("shows the loading state while the list is pending", async () => {
		server.use(
			http.get("*/api/users/me/notifications", async () => {
				await delay("infinite");
				return HttpResponse.json({});
			}),
		);
		renderPage();
		expect(await screen.findByRole("status")).toHaveAccessibleName(
			"Loading notifications",
		);
	});

	it("asks the backend for unread only on the Unread tab", async () => {
		const log = recordRequests();
		renderPage("unread");
		expect(await screen.findAllByRole("listitem")).toHaveLength(2);
		expect(log).toContain(
			"GET /api/users/me/notifications?unread=true&page=1&limit=20",
		);
	});

	it("shows the unread empty state", async () => {
		setMockNotifications([]);
		renderPage("unread");
		expect(
			await screen.findByText("No unread notifications."),
		).toBeInTheDocument();
	});

	it("marks all as read from the page", async () => {
		const log = recordRequests();
		const { user } = renderPage();
		await screen.findAllByRole("listitem");
		await user.click(screen.getByRole("button", { name: "Mark all as read" }));
		await waitFor(() =>
			expect(log).toContain("PATCH /api/users/me/notifications/read-all"),
		);
		await waitFor(() =>
			expect(screen.queryAllByTestId("unread-dot")).toHaveLength(0),
		);
	});

	it("pages through results", async () => {
		setMockNotifications(makeRows(25));
		renderPage("all", 2);
		expect(await screen.findByText("Page 2 of 2")).toBeInTheDocument();
		expect(screen.getAllByRole("listitem")).toHaveLength(5);
		expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
	});
});
