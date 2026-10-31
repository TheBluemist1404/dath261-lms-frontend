import { QueryClientProvider } from "@tanstack/react-query";
import {
	createMemoryHistory,
	createRouter,
	RouterProvider,
} from "@tanstack/react-router";
import { render, screen, within } from "@testing-library/react";
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
		"student",
		"lecturer",
	] as const)("blocks a %s from the admin shell", async (role) => {
		useAuthStore.getState().setUser(userWithRole(role));
		renderAt("/admin");

		expect(
			await screen.findByRole("heading", { name: "Access denied" }),
		).toBeInTheDocument();
		expect(
			screen.queryByRole("heading", { name: "Operational overview" }),
		).not.toBeInTheDocument();
	});

	it("refuses a signed-out visitor", async () => {
		useAuthStore.getState().setUser(null);
		renderAt("/admin");

		expect(
			await screen.findByRole("heading", { name: "Sign in required" }),
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

	it("shows unbuilt admin sections without linking them", async () => {
		useAuthStore.getState().setUser(userWithRole("admin"));
		renderAt("/admin");

		const nav = await screen.findByRole("navigation", {
			name: "Primary navigation",
			hidden: true,
		});
		for (const label of ["Users", "Courses", "Reports"]) {
			const item = within(nav).getByText(label);
			expect(item.closest("a")).toBeNull();
			expect(item).toHaveAttribute("aria-disabled", "true");
		}
	});
});
