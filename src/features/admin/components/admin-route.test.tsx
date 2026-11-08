import { QueryClientProvider } from "@tanstack/react-query";
import {
	createMemoryHistory,
	createRouter,
	RouterProvider,
} from "@tanstack/react-router";
import { render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { routeTree } from "@/routeTree.gen";
import {
	type AuthUser,
	type UserRole,
	useAuthStore,
} from "@/stores/auth.store";
import { createTestQueryClient } from "@/test/render";

// The root route mounts dev-only devtools, which cannot run under jsdom.
vi.mock("@tanstack/react-devtools", () => ({ TanStackDevtools: () => null }));

function userWithRole(role: UserRole): AuthUser {
	return {
		id: `${role}-1`,
		name: `Test ${role}`,
		email: `${role}@example.com`,
		role,
	};
}

function renderAt(path: string) {
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
	return router;
}

describe("/admin route", () => {
	beforeEach(() => {
		useAuthStore.getState().reset();
	});

	it("lets an administrator into the admin shell", async () => {
		useAuthStore.getState().setUser(userWithRole("admin"));
		renderAt("/admin");

		expect(
			await screen.findByRole("heading", { name: "Operational overview" }),
		).toBeInTheDocument();
		// The admin area reuses the shared app layout and its sidebar.
		expect(
			screen.getByRole("navigation", {
				name: "Primary navigation",
				hidden: true,
			}),
		).toBeInTheDocument();
	});

	it.each([
		["student", "/workspace"],
		["lecturer", "/instructor/courses"],
	] as const)("blocks a %s from the admin shell", async (role, home) => {
		useAuthStore.getState().setUser(userWithRole(role));
		const router = renderAt("/admin");

		// The fallback is the landing page, which sends them to their own home.
		await waitFor(() => expect(router.state.location.pathname).toBe(home));
		expect(
			screen.queryByRole("heading", { name: "Operational overview" }),
		).not.toBeInTheDocument();
	});

	it("refuses a signed-out visitor", async () => {
		useAuthStore.getState().setUser(null);
		renderAt("/admin");

		expect(
			await screen.findByRole("heading", {
				name: /welcome back|sign in to nodus/i,
			}),
		).toBeInTheDocument();
		expect(
			screen.queryByRole("heading", { name: "Operational overview" }),
		).not.toBeInTheDocument();
	});

	it.each([
		["admin", true],
		["student", false],
		["lecturer", false],
	] as const)("shows the Administration entry only to admins (%s)", async (role, visible) => {
		useAuthStore.getState().setUser(userWithRole(role));
		renderAt("/");

		const nav = await screen.findByRole("navigation", {
			name: "Primary navigation",
			hidden: true,
		});
		const adminLinks = Array.from(nav.querySelectorAll('a[href="/admin"]'));
		expect(adminLinks).toHaveLength(visible ? 1 : 0);
	});

	it("links the Users, Courses and Reports sections", async () => {
		useAuthStore.getState().setUser(userWithRole("admin"));
		renderAt("/admin");

		const nav = await screen.findByRole("navigation", {
			name: "Primary navigation",
			hidden: true,
		});
		for (const [label, href] of [
			["Users", "/admin/users"],
			["Courses", "/admin/courses"],
			["Reports", "/admin/reports"],
		]) {
			const item = within(nav).getByText(label);
			expect(item.closest("a")).toHaveAttribute("href", href);
		}
	});

	it.each([
		"/admin/users",
		"/admin/courses",
		"/admin/reports",
		"/admin/reports/R-1048",
	])("blocks a student from %s", async (path) => {
		useAuthStore.getState().setUser(userWithRole("student"));
		const router = renderAt(path);

		await waitFor(() =>
			expect(router.state.location.pathname).toBe("/workspace"),
		);
	});
});
