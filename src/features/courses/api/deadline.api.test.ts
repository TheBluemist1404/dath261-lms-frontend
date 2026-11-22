import { QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { createElement, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { setAccessToken } from "@/lib/auth/access-token";
import { resetSessionForTest } from "@/lib/auth/session";
import { installAuthInterceptors } from "@/lib/http/auth-interceptors";
import { createMockAccessToken, resetMockAuth } from "@/mocks/auth.handlers";
import { createMockUpcomingDeadlines } from "@/mocks/enrollments.fixtures";
import { server } from "@/test/mocks/server";
import { createTestQueryClient } from "@/test/render";
import { getMyDeadlines } from "./deadline.api";
import {
	deadlineKeys,
	myDeadlinesOptions,
	useMyDeadlines,
} from "./deadline.queries";

describe("deadline API & queries (MSW)", () => {
	let uninstallInterceptors: (() => void) | null = null;
	let token = "";

	beforeEach(() => {
		resetMockAuth();
		resetSessionForTest();
		uninstallInterceptors = installAuthInterceptors();
		token = createMockAccessToken("st-1", "STUDENT");
		setAccessToken(token);
	});

	afterEach(() => {
		uninstallInterceptors?.();
		uninstallInterceptors = null;
		setAccessToken(null);
		resetMockAuth();
		resetSessionForTest();
	});

	it("sends days=14 by default with the bearer authorization header", async () => {
		let capturedDays: string | null = null;
		let capturedAuth: string | null = null;
		const fixture = createMockUpcomingDeadlines(
			Date.parse("2026-11-19T00:00:00.000Z"),
		).slice(0, 1);

		server.use(
			http.get("*/api/users/me/deadlines", ({ request }) => {
				capturedDays = new URL(request.url).searchParams.get("days");
				capturedAuth = request.headers.get("Authorization");
				return HttpResponse.json(fixture);
			}),
		);

		const result = await getMyDeadlines();

		expect(capturedDays).toBe("14");
		expect(capturedAuth).toBe(`Bearer ${token}`);
		expect(result).toEqual(fixture);
	});

	it("excludes deadlines beyond 14 days by default and sorts ascending via default handler", async () => {
		const result = await getMyDeadlines();

		expect(result.map((item) => item.blockId)).toEqual([
			"block-1-3",
			"block-2-1",
		]);
		expect(result[0]).toMatchObject({
			courseId: "course-intro-cs",
			courseTitle: "Introduction to Computer Science",
			title: "System Call Knowledge Check",
			allowLate: false,
			attemptsUsed: 0,
			maxAttempts: 3,
		});
		expect(result[1]).toMatchObject({
			courseId: "course-intro-cs",
			title: "Process Scheduling Quiz",
			allowLate: true,
			attemptsUsed: 1,
			maxAttempts: 3,
		});
		expect(Date.parse(result[0].deadline)).toBeLessThan(
			Date.parse(result[1].deadline),
		);
	});

	it("honors custom days=30 and includes the +20 days deadline from default handler", async () => {
		const result = await getMyDeadlines(30);

		expect(result.map((item) => item.blockId)).toEqual([
			"block-1-3",
			"block-2-1",
			"block-3-1",
		]);
		expect(result[2]).toMatchObject({
			courseId: "course-intro-cs",
			title: "Virtual Memory Quiz",
			allowLate: false,
			attemptsUsed: 0,
			maxAttempts: 2,
		});
		expect(Date.parse(result[1].deadline)).toBeLessThan(
			Date.parse(result[2].deadline),
		);
	});

	it("excludes all seeded deadlines when look-ahead is 1 day", async () => {
		expect(await getMyDeadlines(1)).toEqual([]);
	});

	it("propagates 401 errors when unauthenticated", async () => {
		setAccessToken(null);

		await expect(getMyDeadlines()).rejects.toMatchObject({
			response: { status: 401 },
		});
	});

	it("wires deadlineKeys, myDeadlinesOptions, and useMyDeadlines cleanly", async () => {
		expect(deadlineKeys.all).toEqual(["deadlines"]);
		expect(deadlineKeys.myList(14)).toEqual(["deadlines", "my", 14]);

		const queryClient = createTestQueryClient();
		const fetched = await queryClient.fetchQuery(myDeadlinesOptions(30));
		expect(fetched.map((item) => item.blockId)).toEqual([
			"block-1-3",
			"block-2-1",
			"block-3-1",
		]);

		function wrapper({ children }: { children: ReactNode }) {
			return createElement(
				QueryClientProvider,
				{ client: queryClient },
				children,
			);
		}

		const disabled = renderHook(() => useMyDeadlines(14, { enabled: false }), {
			wrapper,
		});
		expect(disabled.result.current.fetchStatus).toBe("idle");
		expect(disabled.result.current.data).toBeUndefined();

		const enabled = renderHook(() => useMyDeadlines(14), { wrapper });
		await waitFor(() => expect(enabled.result.current.isSuccess).toBe(true));
		expect(enabled.result.current.data?.map((item) => item.blockId)).toEqual([
			"block-1-3",
			"block-2-1",
		]);
	});
});
