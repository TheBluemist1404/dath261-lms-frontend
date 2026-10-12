import { beforeEach, describe, expect, it, vi } from "vitest";
import * as authApi from "@/features/auth/api/auth.api";
import { mockStudent, resetMockAuth } from "@/features/auth/testing";
import { useAuthStore } from "@/stores/auth.store";
import { bootstrapSession } from "./session";

describe("bootstrapSession", () => {
	beforeEach(() => {
		useAuthStore.getState().reset();
		resetMockAuth();
		vi.restoreAllMocks();
	});

	it("resolves confirmed guest when getCurrentUserApi returns null", async () => {
		vi.spyOn(authApi, "getCurrentUserApi").mockResolvedValue(null);

		const result = await bootstrapSession();

		expect(authApi.getCurrentUserApi).toHaveBeenCalledTimes(1);
		expect(useAuthStore.getState()).toMatchObject({
			status: "unauthenticated",
			user: null,
		});
		expect(result).toEqual({
			user: null,
			isLoading: false,
			isAuthenticated: false,
		});
	});

	it("resolves active user when getCurrentUserApi returns authenticated profile", async () => {
		vi.spyOn(authApi, "getCurrentUserApi").mockResolvedValue(mockStudent);

		const result = await bootstrapSession();

		expect(authApi.getCurrentUserApi).toHaveBeenCalledTimes(1);
		expect(useAuthStore.getState()).toMatchObject({
			status: "authenticated",
			user: mockStudent,
		});
		expect(result).toEqual({
			user: mockStudent,
			isLoading: false,
			isAuthenticated: true,
		});
	});

	it("skips network call if session store is already resolved", async () => {
		useAuthStore.getState().setUser(mockStudent);
		const spy = vi.spyOn(authApi, "getCurrentUserApi");

		const result = await bootstrapSession();

		expect(spy).not.toHaveBeenCalled();
		expect(result).toEqual({
			user: mockStudent,
			isLoading: false,
			isAuthenticated: true,
		});
	});

	it("falls back to guest when getCurrentUserApi rejects", async () => {
		vi.spyOn(authApi, "getCurrentUserApi").mockRejectedValue(
			new Error("Network Error"),
		);

		const result = await bootstrapSession();

		expect(useAuthStore.getState()).toMatchObject({
			status: "unauthenticated",
			user: null,
		});
		expect(result).toEqual({
			user: null,
			isLoading: false,
			isAuthenticated: false,
		});
	});
});
