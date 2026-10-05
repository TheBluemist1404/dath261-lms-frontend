import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { type AuthUser, useAuthStore } from "./auth.store";

const student: AuthUser = {
	id: "student-1",
	name: "Alex Learner",
	email: "alex@example.com",
	role: "student",
};

describe("auth store", () => {
	beforeEach(() => {
		useAuthStore.getState().reset();
	});

	it("distinguishes an unresolved session from a confirmed guest", () => {
		expect(useAuthStore.getState()).toMatchObject({
			status: "loading",
			user: null,
		});

		useAuthStore.getState().setUser(null);

		expect(useAuthStore.getState()).toMatchObject({
			status: "unauthenticated",
			user: null,
		});
	});

	it("updates role subscribers and removes the previous identity on logout", () => {
		const { result } = renderHook(() =>
			useAuthStore((state) => state.user?.role),
		);

		act(() => useAuthStore.getState().setUser(student));
		expect(result.current).toBe("student");
		expect(useAuthStore.getState().status).toBe("authenticated");

		act(() =>
			useAuthStore.getState().setUser({ ...student, role: "lecturer" }),
		);
		expect(result.current).toBe("lecturer");

		act(() => useAuthStore.getState().clearAuth());
		expect(result.current).toBeUndefined();
		expect(useAuthStore.getState()).toMatchObject({
			status: "unauthenticated",
			user: null,
		});
	});

	it("discards the previous identity before resolving another session", () => {
		useAuthStore.getState().setUser(student);
		useAuthStore.getState().reset();

		expect(useAuthStore.getState()).toMatchObject({
			status: "loading",
			user: null,
		});
	});
});
