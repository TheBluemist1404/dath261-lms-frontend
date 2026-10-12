import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	mockStudent,
	resetMockAuth,
	setMockCurrentUser,
} from "@/features/auth/testing";
import { queryClient } from "@/lib/query/client";
import { router } from "@/router";
import { useAuthStore } from "@/stores/auth.store";
import { useAuth } from "./use-auth";

describe("useAuth", () => {
	beforeEach(() => {
		useAuthStore.getState().reset();
		resetMockAuth();
		vi.spyOn(router, "invalidate").mockResolvedValue(undefined);
		vi.spyOn(queryClient, "clear");
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("reflects unauthenticated state when store is cleared", () => {
		useAuthStore.getState().clearAuth();
		const { result } = renderHook(() => useAuth());

		expect(result.current.status).toBe("unauthenticated");
		expect(result.current.user).toBeNull();
		expect(result.current.isAuthenticated).toBe(false);
		expect(result.current.isLoading).toBe(false);
	});

	it("reflects authenticated state when store has active user", () => {
		useAuthStore.getState().setUser(mockStudent);
		const { result } = renderHook(() => useAuth());

		expect(result.current.status).toBe("authenticated");
		expect(result.current.user).toEqual(mockStudent);
		expect(result.current.isAuthenticated).toBe(true);
		expect(result.current.isLoading).toBe(false);
	});

	it("logs in successfully, updates store, and invalidates router", async () => {
		useAuthStore.getState().clearAuth();
		const { result } = renderHook(() => useAuth());

		await act(async () => {
			const res = await result.current.login({
				email: "alex@nodus.edu",
				password: "valid-password",
			});
			expect(res.user.email).toBe("alex@nodus.edu");
		});

		expect(result.current.isAuthenticated).toBe(true);
		expect(result.current.user?.email).toBe("alex@nodus.edu");
		expect(router.invalidate).toHaveBeenCalledTimes(1);
	});

	it("registers successfully, updates store, and invalidates router", async () => {
		useAuthStore.getState().clearAuth();
		const { result } = renderHook(() => useAuth());

		await act(async () => {
			const res = await result.current.register({
				name: "New Learner",
				email: "newlearner@nodus.edu",
				password: "password123",
				role: "student",
			});
			expect(res.user.name).toBe("New Learner");
		});

		expect(result.current.isAuthenticated).toBe(true);
		expect(result.current.user?.name).toBe("New Learner");
		expect(router.invalidate).toHaveBeenCalledTimes(1);
	});

	it("clears store, query client cache, and invalidates router on logout", async () => {
		useAuthStore.getState().setUser(mockStudent);
		queryClient.setQueryData(["test-key"], { data: "cached" });
		const { result } = renderHook(() => useAuth());

		await act(async () => {
			await result.current.logout();
		});

		expect(result.current.isAuthenticated).toBe(false);
		expect(result.current.user).toBeNull();
		expect(queryClient.clear).toHaveBeenCalledTimes(1);
		expect(router.invalidate).toHaveBeenCalledTimes(1);
	});

	it("refreshes active session from api and invalidates router", async () => {
		setMockCurrentUser(mockStudent);
		useAuthStore.getState().clearAuth();
		const { result } = renderHook(() => useAuth());

		await act(async () => {
			const user = await result.current.refreshSession();
			expect(user).toEqual(mockStudent);
		});

		expect(result.current.isAuthenticated).toBe(true);
		expect(result.current.user).toEqual(mockStudent);
		expect(router.invalidate).toHaveBeenCalledTimes(1);
	});
});
