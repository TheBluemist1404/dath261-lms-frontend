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
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/stores/auth.store";
import { createTestQueryClient } from "@/test/render";
import { LoginForm } from "./login-form";

describe("LoginForm", () => {
	beforeEach(() => {
		useAuthStore.setState({
			status: "unauthenticated",
			user: null,
		});
	});

	function renderLoginForm(
		props: { redirect?: string; onSuccess?: () => void } = {},
	) {
		const rootRoute = createRootRoute();
		const loginRoute = createRoute({
			getParentRoute: () => rootRoute,
			path: "/login",
			component: () => <LoginForm {...props} />,
		});
		const homeRoute = createRoute({
			getParentRoute: () => rootRoute,
			path: "/",
			component: () => <div>Home Page</div>,
		});
		const targetRoute = createRoute({
			getParentRoute: () => rootRoute,
			path: "/dashboard",
			component: () => <div>Dashboard Page</div>,
		});

		const history = createMemoryHistory({ initialEntries: ["/login"] });
		const queryClient = createTestQueryClient();
		const router = createRouter({
			routeTree: rootRoute.addChildren([loginRoute, homeRoute, targetRoute]),
			history,
		});

		render(
			<QueryClientProvider client={queryClient}>
				<RouterProvider router={router} />
			</QueryClientProvider>,
		);

		return { router, user: userEvent.setup() };
	}

	it("renders email and password inputs and submit button", async () => {
		renderLoginForm();

		expect(await screen.findByLabelText(/email address/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /^sign in$/i }),
		).toBeInTheDocument();
		expect(screen.getByRole("link", { name: /sign up/i })).toBeInTheDocument();
	});

	it("displays validation error when submitting empty fields", async () => {
		const { user } = renderLoginForm();

		const submitButton = await screen.findByRole("button", {
			name: /^sign in$/i,
		});
		await user.click(submitButton);

		expect(screen.getByRole("alert")).toHaveTextContent(
			"Please fill in both email and password.",
		);
	});

	it("submits valid credentials and triggers onSuccess callback", async () => {
		const handleSuccess = vi.fn();
		const { user } = renderLoginForm({ onSuccess: handleSuccess });

		const emailInput = await screen.findByLabelText(/email address/i);
		await user.type(emailInput, "student@example.com");
		await user.type(screen.getByLabelText(/password/i), "password123");
		await user.click(screen.getByRole("button", { name: /^sign in$/i }));

		await waitFor(() => {
			expect(handleSuccess).toHaveBeenCalledTimes(1);
		});

		expect(useAuthStore.getState().status).toBe("authenticated");
		expect(useAuthStore.getState().user?.email).toBe("student@example.com");
	});

	it("navigates to redirect destination upon successful login", async () => {
		const { user, router } = renderLoginForm({ redirect: "/dashboard" });

		const emailInput = await screen.findByLabelText(/email address/i);
		await user.type(emailInput, "student@example.com");
		await user.type(screen.getByLabelText(/password/i), "password123");
		await user.click(screen.getByRole("button", { name: /^sign in$/i }));

		await waitFor(() => {
			expect(router.state.location.pathname).toBe("/dashboard");
		});
	});

	it("displays error message on invalid credentials", async () => {
		const { user } = renderLoginForm();

		const emailInput = await screen.findByLabelText(/email address/i);
		await user.type(emailInput, "invalid@example.com");
		await user.type(screen.getByLabelText(/password/i), "wrong-password");
		await user.click(screen.getByRole("button", { name: /^sign in$/i }));

		await waitFor(() => {
			expect(screen.getByRole("alert")).toHaveTextContent(
				"Invalid email or password",
			);
		});

		expect(useAuthStore.getState().status).toBe("unauthenticated");
	});
});
