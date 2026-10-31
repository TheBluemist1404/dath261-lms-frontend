import { afterEach, describe, expect, it, vi } from "vitest";
import { httpClient } from "@/lib/http/client";
import type { Course } from "../types/course.types";
import {
	createCourse,
	deleteCourse,
	listCourses,
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
		expect(httpClient.post).toHaveBeenCalledWith("/courses", input);
	});
	it("updates course publication through the status field, not a per-lesson published flag", async () => {
		vi.mocked(httpClient.patch).mockResolvedValue({
			data: { ...course, status: "PUBLISHED" },
		} as never);
		await updateCourseStatus("course/1", "PUBLISHED");
		expect(httpClient.patch).toHaveBeenCalledWith("/courses/course%2F1", {
			status: "PUBLISHED",
		});
	});
	it("deletes a course through the shared client", async () => {
		vi.mocked(httpClient.delete).mockResolvedValue({} as never);
		await deleteCourse("course-1");
		expect(httpClient.delete).toHaveBeenCalledWith("/courses/course-1");
	});
});
