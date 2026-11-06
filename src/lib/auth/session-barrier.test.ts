import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAccessToken, setAccessToken } from "@/lib/auth/access-token";
import { httpClient } from "@/lib/http/client";
import { useAuthStore } from "@/stores/auth.store";
import {
	bootstrapSessionSafe,
	getSessionEpoch,
	invalidateSessionEpoch,
	resetSessionBarrierForTest,
} from "./session-barrier";

describe("session-barrier", () => {
	beforeEach(() => {
		resetSessionBarrierForTest();
		setAccessToken(null);
		useAuthStore.getState().reset();
		localStorage.clear();
		vi.restoreAllMocks();
	});

	it("increments monotonic sessionEpoch upon invalidation", () => {
		expect(getSessionEpoch()).toBe(0);
		expect(invalidateSessionEpoch()).toBe(1);
		expect(getSessionEpoch()).toBe(1);
		expect(invalidateSessionEpoch()).toBe(2);
		expect(getSessionEpoch()).toBe(2);
	});

	it("suppresses network refresh when nodus_logout_tombstone is active in localStorage", async () => {
		localStorage.setItem("nodus_logout_tombstone", "true");
		const postSpy = vi.spyOn(httpClient, "post");

		const result = await bootstrapSessionSafe();

		expect(result).toEqual({
			user: null,
			isLoading: false,
			isAuthenticated: false,
		});
		expect(postSpy).not.toHaveBeenCalled();
		expect(useAuthStore.getState().status).toBe("unauthenticated");
	});

	it("returns existing auth context when already authenticated", async () => {
		const mockUser = {
			id: "usr_active",
			email: "active@example.com",
			name: "Active User",
			role: "student" as const,
		};
		useAuthStore.getState().setUser(mockUser);
		const postSpy = vi.spyOn(httpClient, "post");

		const result = await bootstrapSessionSafe();

		expect(result).toEqual({
			user: mockUser,
			isLoading: false,
			isAuthenticated: true,
		});
		expect(postSpy).not.toHaveBeenCalled();
	});

	it("deduplicates concurrent bootstrapSessionSafe invocations into a single HTTP call", async () => {
		let resolveCall!: (value: unknown) => void;
		const delayedPromise = new Promise((resolve) => {
			resolveCall = resolve;
		});

		const postSpy = vi
			.spyOn(httpClient, "post")
			.mockImplementation(() => delayedPromise as Promise<never>);

		const call1 = bootstrapSessionSafe();
		const call2 = bootstrapSessionSafe();
		const call3 = bootstrapSessionSafe();

		expect(postSpy).toHaveBeenCalledTimes(1);

		const fakeToken =
			"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c3JfZGVkdXAiLCJlbWFpbCI6ImRlZHVwQGV4YW1wbGUuY29tIiwicm9sZSI6IlNUVURFTlQiLCJpYXQiOjE2MDAwMDAwMDAsImV4cCI6MjAwMDAwMDAwMH0.signature";

		resolveCall({ data: { accessToken: fakeToken } });

		const [res1, res2, res3] = await Promise.all([call1, call2, call3]);

		expect(res1.isAuthenticated).toBe(true);
		expect(res2.isAuthenticated).toBe(true);
		expect(res3.isAuthenticated).toBe(true);
		expect(res1.user?.id).toBe("usr_dedup");
	});

	it("discards in-flight bootstrap resolution if invalidateSessionEpoch is triggered before completion", async () => {
		let resolveCall!: (value: unknown) => void;
		const delayedPromise = new Promise((resolve) => {
			resolveCall = resolve;
		});

		vi.spyOn(httpClient, "post").mockImplementation(
			() => delayedPromise as Promise<never>,
		);

		const inFlightBootstrap = bootstrapSessionSafe();

		// Simulate user clicking logout while refresh request is in flight
		invalidateSessionEpoch();
		expect(getSessionEpoch()).toBe(1);

		const fakeToken =
			"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c3Jfc3RhbGUiLCJlbWFpbCI6InN0YWxlQGV4YW1wbGUuY29tIiwicm9sZSI6IlNUVURFTlQiLCJpYXQiOjE2MDAwMDAwMDAsImV4cCI6MjAwMDAwMDAwMH0.signature";

		resolveCall({ data: { accessToken: fakeToken } });

		const result = await inFlightBootstrap;

		expect(result).toEqual({
			user: null,
			isLoading: false,
			isAuthenticated: false,
		});
		// Ensure state was NOT committed to memory or store
		expect(getAccessToken()).toBeNull();
		expect(useAuthStore.getState().user).toBeNull();
	});

	it("handles HTTP failure gracefully and sets unauthenticated state", async () => {
		vi.spyOn(httpClient, "post").mockRejectedValue(new Error("Network Error"));

		const result = await bootstrapSessionSafe();

		expect(result).toEqual({
			user: null,
			isLoading: false,
			isAuthenticated: false,
		});
		expect(useAuthStore.getState().status).toBe("unauthenticated");
	});
});
