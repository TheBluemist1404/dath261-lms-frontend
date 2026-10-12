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
import { beforeEach, describe, expect, it } from "vitest";
import { useAuthStore } from "@/stores/auth.store";
import { createTestQueryClient } from "@/test/render";
import Header from "./header";

describe("Header", () => {
	beforeEach(() => {
		useAuthStore.setState({
			status: "unauthenticated",
			user: null,
		});
	});

	function renderHeader() {
		const rootRoute = createRootRoute();
		const indexRoute = createRoute({
			getParentRoute: () => rootRoute,
			path: "/",
			component: () => <Header />,
		});
		const loginRoute = createRoute({
			getParentRoute: () => rootRoute,
			path: "/login",
			component: () => <div>Login Page</div>,
		});

		const history = createMemoryHistory({ initialEntries: ["/"] });
		const queryClient = createTestQueryClient();
		const router = createRouter({
			routeTree: rootRoute.addChildren([indexRoute, loginRoute]),
			history,
		});

		render(
			<QueryClientProvider client={queryClient}>
				<RouterProvider router={router} />
			</QueryClientProvider>,
		);

		return { router, user: userEvent.setup() };
	}

	it("renders Sign in link when user is unauthenticated", async () => {
		renderHeader();

		const signInLink = await screen.findByRole("link", { name: /sign in/i });
		expect(signInLink).toBeInTheDocument();
		expect(signInLink).toHaveAttribute("href", "/login");
		expect(
			screen.queryByRole("button", { name: /sign out/i }),
		).not.toBeInTheDocument();
	});

	it("renders user initials and Sign out button when authenticated", async () => {
		useAuthStore.setState({
			status: "authenticated",
			user: {
				id: "usr_10",
				name: "Sara Miller",
				email: "sara@example.com",
				role: "student",
			},
		});

		renderHeader();

		expect(
			await screen.findByRole("button", { name: /sign out/i }),
		).toBeInTheDocument();
		expect(
			screen.getByLabelText(/profile for sara miller/i),
		).toBeInTheDocument();
		expect(
			screen.queryByRole("link", { name: /sign in/i }),
		).not.toBeInTheDocument();
	});

	it("signs out and clears user session when Sign out button is clicked", async () => {
		useAuthStore.setState({
			status: "authenticated",
			user: {
				id: "usr_11",
				name: "David Chen",
				email: "david@example.com",
				role: "lecturer",
			},
		});

		const { user } = renderHeader();

		const signOutButton = await screen.findByRole("button", {
			name: /sign out/i,
		});
		await user.click(signOutButton);

		await waitFor(() => {
			expect(useAuthStore.getState().status).toBe("unauthenticated");
		});

		expect(useAuthStore.getState().user).toBeNull();
		expect(
			await screen.findByRole("link", { name: /sign in/i }),
		).toBeInTheDocument();
	});
});
