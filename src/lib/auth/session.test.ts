import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAccessToken, setAccessToken } from "@/lib/auth/access-token";
import { httpClient } from "@/lib/http/client";
import { useAuthStore } from "@/stores/auth.store";
import {
	bootstrapSession,
	getSessionEpoch,
	invalidateSessionEpoch,
	resetSessionForTest,
} from "./session";

describe("session lifecycle and barrier", () => {
	beforeEach(() => {
		resetSessionForTest();
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

		const result = await bootstrapSession();

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

		const result = await bootstrapSession();

		expect(result).toEqual({
			user: mockUser,
			isLoading: false,
			isAuthenticated: true,
		});
		expect(postSpy).not.toHaveBeenCalled();
	});

	it("deduplicates concurrent bootstrapSession invocations into a single HTTP call", async () => {
		let resolveCall!: (value: unknown) => void;
		const delayedPromise = new Promise((resolve) => {
			resolveCall = resolve;
		});

		const postSpy = vi
			.spyOn(httpClient, "post")
			.mockImplementation(() => delayedPromise as Promise<never>);

		const call1 = bootstrapSession();
		const call2 = bootstrapSession();
		const call3 = bootstrapSession();

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

		const inFlightBootstrap = bootstrapSession();

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
		expect(getAccessToken()).toBeNull();
		expect(useAuthStore.getState().user).toBeNull();
	});

	it("handles HTTP failure gracefully and sets unauthenticated state", async () => {
		vi.spyOn(httpClient, "post").mockRejectedValue(new Error("Network Error"));

		const result = await bootstrapSession();

		expect(result).toEqual({
			user: null,
			isLoading: false,
			isAuthenticated: false,
		});
		expect(useAuthStore.getState().status).toBe("unauthenticated");
	});

	it("short-circuits and returns unauthenticated context without calling /auth/refresh when status is already unauthenticated", async () => {
		useAuthStore.getState().clearAuth();
		const postSpy = vi.spyOn(httpClient, "post");

		const result = await bootstrapSession();

		expect(result).toEqual({
			user: null,
			isLoading: false,
			isAuthenticated: false,
		});
		expect(postSpy).not.toHaveBeenCalled();
	});

	it("short-circuits subsequent bootstrapSession calls after an initial failed refresh", async () => {
		const postSpy = vi
			.spyOn(httpClient, "post")
			.mockRejectedValue(new Error("401 Unauthorized"));

		const firstResult = await bootstrapSession();
		expect(firstResult.isAuthenticated).toBe(false);
		expect(postSpy).toHaveBeenCalledTimes(1);

		const secondResult = await bootstrapSession();
		expect(secondResult.isAuthenticated).toBe(false);
		expect(postSpy).toHaveBeenCalledTimes(1);
	});

	it("allows /auth/refresh to fire again when store status is reset to loading", async () => {
		useAuthStore.getState().clearAuth();
		const postSpy = vi.spyOn(httpClient, "post").mockResolvedValue({
			data: {
				accessToken:
					"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c3JfcmVzZXQiLCJlbWFpbCI6InJlc2V0QGV4YW1wbGUuY29tIiwicm9sZSI6IlNUVURFTlQiLCJpYXQiOjE2MDAwMDAwMDAsImV4cCI6MjAwMDAwMDAwMH0.signature",
			},
		} as never);

		await bootstrapSession();
		expect(postSpy).not.toHaveBeenCalled();

		useAuthStore.getState().reset();
		const result = await bootstrapSession();
		expect(postSpy).toHaveBeenCalledTimes(1);
		expect(result.isAuthenticated).toBe(true);
	});
});
