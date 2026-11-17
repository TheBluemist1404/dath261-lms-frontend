import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type React from "react";
import { describe, expect, it, vi } from "vitest";
import * as enrollmentApi from "../api/enrollment.api";
import { enrollmentKeys } from "../api/enrollment.queries";
import { useEnrollCourse, useLeaveCourse } from "./use-enrollment-mutations";

function createWrapper() {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
	const wrapper = ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
	return { queryClient, wrapper };
}

describe("useEnrollCourse", () => {
	it("optimistically updates cache to ACTIVE and invalidates queries on success", async () => {
		const { queryClient, wrapper } = createWrapper();
		queryClient.setQueryData(enrollmentKeys.course("c-1"), {
			courseId: "c-1",
			enrollmentId: null,
			enrollmentStatus: null,
			courseAvailable: true,
			canAccessCourse: false,
		});
		vi.spyOn(enrollmentApi, "enrollInCourse").mockResolvedValue({
			enrollmentId: "enr-1",
			courseId: "c-1",
			status: "ACTIVE",
			canAccessCourse: true,
		});

		const { result } = renderHook(() => useEnrollCourse("c-1"), { wrapper });
		await act(async () => {
			await result.current.mutateAsync();
		});

		await waitFor(() => {
			expect(
				queryClient.getQueryData(enrollmentKeys.course("c-1")),
			).toMatchObject({
				enrollmentStatus: "ACTIVE",
				canAccessCourse: true,
			});
		});
	});

	it("rolls back optimistic cache update when mutation errors", async () => {
		const { queryClient, wrapper } = createWrapper();
		const initial = {
			courseId: "c-1",
			enrollmentId: null,
			enrollmentStatus: null,
			courseAvailable: true,
			canAccessCourse: false,
		};
		queryClient.setQueryData(enrollmentKeys.course("c-1"), initial);
		vi.spyOn(enrollmentApi, "enrollInCourse").mockRejectedValue(
			new Error("fail"),
		);

		const { result } = renderHook(() => useEnrollCourse("c-1"), { wrapper });
		await act(async () => {
			try {
				await result.current.mutateAsync();
			} catch {}
		});

		await waitFor(() => {
			expect(queryClient.getQueryData(enrollmentKeys.course("c-1"))).toEqual(
				initial,
			);
		});
	});
});

describe("useLeaveCourse", () => {
	it("optimistically updates cache to LEFT and invalidates queries on success", async () => {
		const { queryClient, wrapper } = createWrapper();
		queryClient.setQueryData(enrollmentKeys.course("c-1"), {
			courseId: "c-1",
			enrollmentId: "enr-1",
			enrollmentStatus: "ACTIVE",
			courseAvailable: true,
			canAccessCourse: true,
		});
		vi.spyOn(enrollmentApi, "leaveCourse").mockResolvedValue({
			enrollmentId: "enr-1",
			courseId: "c-1",
			status: "LEFT",
			canAccessCourse: false,
		});

		const { result } = renderHook(() => useLeaveCourse("c-1"), { wrapper });
		await act(async () => {
			await result.current.mutateAsync();
		});

		await waitFor(() => {
			expect(
				queryClient.getQueryData(enrollmentKeys.course("c-1")),
			).toMatchObject({
				enrollmentStatus: "LEFT",
				canAccessCourse: false,
			});
		});
	});

	it("rolls back optimistic cache update on deletion failure", async () => {
		const { queryClient, wrapper } = createWrapper();
		const active = {
			courseId: "c-1",
			enrollmentId: "enr-1",
			enrollmentStatus: "ACTIVE" as const,
			courseAvailable: true,
			canAccessCourse: true,
		};
		queryClient.setQueryData(enrollmentKeys.course("c-1"), active);
		vi.spyOn(enrollmentApi, "leaveCourse").mockRejectedValue(new Error("fail"));

		const { result } = renderHook(() => useLeaveCourse("c-1"), { wrapper });
		await act(async () => {
			try {
				await result.current.mutateAsync();
			} catch {}
		});

		await waitFor(() => {
			expect(queryClient.getQueryData(enrollmentKeys.course("c-1"))).toEqual(
				active,
			);
		});
	});
});
