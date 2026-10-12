import { QueryClientProvider } from "@tanstack/react-query";
import {
	createMemoryHistory,
	createRouter,
	RouterProvider,
} from "@tanstack/react-router";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { routeTree } from "@/routeTree.gen";
import { useAuthStore } from "@/stores/auth.store";
import { createTestQueryClient } from "@/test/render";

describe("route guards integration", () => {
	const mockStudent = {
		id: "usr_student",
		email: "student@example.com",
		name: "Student One",
		role: "student" as const,
	};

	beforeEach(() => {
		useAuthStore.setState({
			status: "unauthenticated",
			user: null,
		});
	});

	function renderApp(initialPath: string) {
		const history = createMemoryHistory({
			initialEntries: [initialPath],
		});
		const queryClient = createTestQueryClient();
		const router = createRouter({
			routeTree,
			history,
			context: {
				queryClient,
				auth: {
					user: useAuthStore.getState().user,
					isLoading: false,
					isAuthenticated: useAuthStore.getState().status === "authenticated",
				},
			},
		});

		render(
			<QueryClientProvider client={queryClient}>
				<RouterProvider router={router} />
			</QueryClientProvider>,
		);

		return { router, history };
	}

	it("redirects guest accessing protected dashboard to login with redirect param", async () => {
		const { router } = renderApp("/dashboard");

		await waitFor(() => {
			expect(
				screen.getByRole("heading", { name: "Sign in to Nodus" }),
			).toBeInTheDocument();
		});

		expect(router.state.location.pathname).toBe("/login");
		expect(router.state.location.search).toEqual({ redirect: "/dashboard" });
	});

	it("allows authenticated user into protected dashboard", async () => {
		useAuthStore.setState({
			status: "authenticated",
			user: mockStudent,
		});

		const { router } = renderApp("/dashboard");

		await waitFor(() => {
			expect(
				screen.getByRole("heading", { name: "Dashboard" }),
			).toBeInTheDocument();
		});

		expect(router.state.location.pathname).toBe("/dashboard");
	});

	it("redirects authenticated user visiting login page to home", async () => {
		useAuthStore.setState({
			status: "authenticated",
			user: mockStudent,
		});

		const { router } = renderApp("/login");

		await waitFor(() => {
			expect(
				screen.getByRole("heading", { name: "Learner-Oriented LMS" }),
			).toBeInTheDocument();
		});

		expect(router.state.location.pathname).toBe("/");
	});

	it("redirects authenticated user visiting login with redirect search to target", async () => {
		useAuthStore.setState({
			status: "authenticated",
			user: mockStudent,
		});

		const { router } = renderApp("/login?redirect=/dashboard");

		await waitFor(() => {
			expect(
				screen.getByRole("heading", { name: "Dashboard" }),
			).toBeInTheDocument();
		});

		expect(router.state.location.pathname).toBe("/dashboard");
	});

	it("allows unauthenticated visitor to see login page", async () => {
		const { router } = renderApp("/login");

		await waitFor(() => {
			expect(
				screen.getByRole("heading", { name: "Sign in to Nodus" }),
			).toBeInTheDocument();
		});

		expect(router.state.location.pathname).toBe("/login");
	});

	it("allows unauthenticated visitor to see register page", async () => {
		const { router } = renderApp("/register");

		await waitFor(() => {
			expect(
				screen.getByRole("heading", { name: "Create your account" }),
			).toBeInTheDocument();
		});

		expect(router.state.location.pathname).toBe("/register");
	});
});
