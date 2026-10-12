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
import { RegisterForm } from "./register-form";

describe("RegisterForm", () => {
	beforeEach(() => {
		useAuthStore.setState({
			status: "unauthenticated",
			user: null,
		});
	});

	function renderRegisterForm(
		props: { redirect?: string; onSuccess?: () => void } = {},
	) {
		const rootRoute = createRootRoute();
		const registerRoute = createRoute({
			getParentRoute: () => rootRoute,
			path: "/register",
			component: () => <RegisterForm {...props} />,
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

		const history = createMemoryHistory({ initialEntries: ["/register"] });
		const queryClient = createTestQueryClient();
		const router = createRouter({
			routeTree: rootRoute.addChildren([registerRoute, homeRoute, targetRoute]),
			history,
		});

		render(
			<QueryClientProvider client={queryClient}>
				<RouterProvider router={router} />
			</QueryClientProvider>,
		);

		return { router, user: userEvent.setup() };
	}

	it("renders name, email, password, role toggle, and submit button", async () => {
		renderRegisterForm();

		expect(await screen.findByLabelText(/full name/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
		expect(screen.getByRole("radio", { name: /student/i })).toBeInTheDocument();
		expect(
			screen.getByRole("radio", { name: /lecturer/i }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /^create account$/i }),
		).toBeInTheDocument();
		expect(screen.getByRole("link", { name: /sign in/i })).toBeInTheDocument();
	});

	it("displays validation error when required fields are missing", async () => {
		const { user } = renderRegisterForm();

		const submitButton = await screen.findByRole("button", {
			name: /^create account$/i,
		});
		await user.click(submitButton);

		expect(screen.getByRole("alert")).toHaveTextContent(
			"Please fill in all required fields.",
		);
	});

	it("displays validation error when password is less than 6 characters", async () => {
		const { user } = renderRegisterForm();

		const nameInput = await screen.findByLabelText(/full name/i);
		await user.type(nameInput, "Morgan");
		await user.type(
			screen.getByLabelText(/email address/i),
			"morgan@example.com",
		);
		await user.type(screen.getByLabelText(/password/i), "12345");
		await user.click(screen.getByRole("button", { name: /^create account$/i }));

		expect(screen.getByRole("alert")).toHaveTextContent(
			"Password must be at least 6 characters long.",
		);
	});

	it("submits registration with chosen lecturer role and updates session", async () => {
		const handleSuccess = vi.fn();
		const { user } = renderRegisterForm({ onSuccess: handleSuccess });

		const lecturerRadio = await screen.findByRole("radio", {
			name: /lecturer/i,
		});
		await user.click(lecturerRadio);
		await user.type(screen.getByLabelText(/full name/i), "Professor Smith");
		await user.type(
			screen.getByLabelText(/email address/i),
			"smith@university.edu",
		);
		await user.type(screen.getByLabelText(/password/i), "securePass123");
		await user.click(screen.getByRole("button", { name: /^create account$/i }));

		await waitFor(() => {
			expect(handleSuccess).toHaveBeenCalledTimes(1);
		});

		expect(useAuthStore.getState().status).toBe("authenticated");
		expect(useAuthStore.getState().user?.role).toBe("lecturer");
		expect(useAuthStore.getState().user?.name).toBe("Professor Smith");
	});

	it("displays error banner when email is already registered", async () => {
		const { user } = renderRegisterForm();

		const nameInput = await screen.findByLabelText(/full name/i);
		await user.type(nameInput, "Existing User");
		await user.type(
			screen.getByLabelText(/email address/i),
			"exists@example.com",
		);
		await user.type(screen.getByLabelText(/password/i), "password123");
		await user.click(screen.getByRole("button", { name: /^create account$/i }));

		await waitFor(() => {
			expect(screen.getByRole("alert")).toHaveTextContent(
				"Email already registered",
			);
		});

		expect(useAuthStore.getState().status).toBe("unauthenticated");
	});
});
