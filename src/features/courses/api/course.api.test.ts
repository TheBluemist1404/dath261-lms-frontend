import { afterEach, describe, expect, it, vi } from "vitest";
import { httpClient } from "@/lib/http/client";
import type { Course } from "../types/course.types";
import {
	createCourse,
	listCourses,
	listPublishedCourses,
	updateCourse,
	updateCourseStatus,
} from "./course.api";

vi.mock("@/lib/http/client", () => ({
	httpClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));
const course: Course = {
	id: "course-1",
	title: "Networks",
	description: null,
	prerequisites: null,
	status: "DRAFT",
	enrollmentStartAt: null,
	enrollmentEndAt: null,
};

afterEach(() => vi.clearAllMocks());

describe("course API", () => {
	it("lists courses with the TanStack Query abort signal", async () => {
		vi.mocked(httpClient.get).mockResolvedValue({ data: [course] } as never);
		const signal = new AbortController().signal;
		expect(await listCourses(signal)).toEqual([course]);
		expect(httpClient.get).toHaveBeenCalledWith("/courses", { signal });
	});
	it("creates a course using backend model fields", async () => {
		vi.mocked(httpClient.post).mockResolvedValue({ data: course } as never);
		const input = {
			title: "Networks",
			description: null,
			prerequisites: null,
			status: "DRAFT" as const,
			enrollmentStartAt: null,
			enrollmentEndAt: null,
		};
		expect(await createCourse(input)).toEqual(course);
		const { status: _status, ...fields } = input;
		expect(httpClient.post).toHaveBeenCalledWith("/courses", fields);
	});
	it("updates course fields without status, then changes status through its endpoint", async () => {
		vi.mocked(httpClient.patch)
			.mockResolvedValueOnce({ data: course } as never)
			.mockResolvedValueOnce({
				data: { ...course, status: "PUBLISHED" },
			} as never);
		const result = await updateCourse("course-1", {
			title: "Networks 2",
			status: "PUBLISHED",
		});
		expect(result.status).toBe("PUBLISHED");
		expect(httpClient.patch).toHaveBeenNthCalledWith(1, "/courses/course-1", {
			title: "Networks 2",
		});
		expect(httpClient.patch).toHaveBeenNthCalledWith(
			2,
			"/courses/course-1/status",
			{ status: "PUBLISHED" },
		);
	});
	it("skips the status call when the status is unchanged", async () => {
		vi.mocked(httpClient.patch).mockResolvedValue({ data: course } as never);
		await updateCourse("course-1", { title: "Networks", status: "DRAFT" });
		expect(httpClient.patch).toHaveBeenCalledTimes(1);
	});
	it("reads the public catalog without starting a session refresh", async () => {
		const page = {
			data: [course],
			meta: {
				total: 1,
				page: 1,
				limit: 3,
				totalPages: 1,
				hasNextPage: false,
				hasPrevPage: false,
			},
		};
		vi.mocked(httpClient.get).mockResolvedValue({ data: page } as never);
		expect(
			await listPublishedCourses({ limit: 3, enrollmentOpen: true }),
		).toEqual(page);
		expect(httpClient.get).toHaveBeenCalledWith("/courses/catalog", {
			params: { limit: 3, enrollmentOpen: "true" },
			signal: undefined,
			skipAuthRefresh: true,
		});
	});
	it("updates course publication through the status field, not a per-lesson published flag", async () => {
		vi.mocked(httpClient.patch).mockResolvedValue({
			data: { ...course, status: "PUBLISHED" },
		} as never);
		await updateCourseStatus("course/1", "PUBLISHED");
		expect(httpClient.patch).toHaveBeenCalledWith(
			"/courses/course%2F1/status",
			{
				status: "PUBLISHED",
			},
		);
	});
	it("updates course status through the status endpoint", async () => {
		vi.mocked(httpClient.patch).mockResolvedValue({
			data: { ...course, status: "PUBLISHED" },
		} as never);

		await updateCourseStatus("course-1", "PUBLISHED");

		expect(httpClient.patch).toHaveBeenCalledWith("/courses/course-1/status", {
			status: "PUBLISHED",
		});
	});
});
