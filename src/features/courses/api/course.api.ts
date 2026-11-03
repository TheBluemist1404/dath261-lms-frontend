import { httpClient } from "@/lib/http/client";
import type {
	Course,
	CourseInput,
	CourseUpdateInput,
} from "../types/course.types";

/**
 * Course endpoints use the shared authenticated HTTP client.
 * Keep endpoint and DTO changes centralized here so they can be aligned with
 * the backend Swagger contract without changing UI components.
 */
export async function listCourses(signal?: AbortSignal): Promise<Course[]> {
	const { data } = await httpClient.get<Course[]>("/courses", { signal });
	return data;
}

/**
 * Public catalog read (BE #26). The path is provisional until that PR merges;
 * callers must treat any failure as "no catalog yet". Guests have no session
 * to refresh, so a 401 here must not start the refresh flow.
 */
export async function listPublishedCourses(
	signal?: AbortSignal,
): Promise<Course[]> {
	const { data } = await httpClient.get<Course[]>("/courses/published", {
		signal,
		skipAuthRefresh: true,
	});
	return data;
}

export async function getCourse(
	courseId: string,
	signal?: AbortSignal,
): Promise<Course> {
	const { data } = await httpClient.get<Course>(
		`/courses/${encodeURIComponent(courseId)}`,
		{ signal },
	);
	return data;
}

export async function createCourse(input: CourseInput): Promise<Course> {
	const { data } = await httpClient.post<Course>("/courses", input);
	return data;
}

export async function updateCourse(
	courseId: string,
	input: CourseUpdateInput,
): Promise<Course> {
	const { data } = await httpClient.patch<Course>(
		`/courses/${encodeURIComponent(courseId)}`,
		input,
	);
	return data;
}

export async function updateCourseStatus(
	courseId: string,
	status: Course["status"],
): Promise<Course> {
	const { data } = await httpClient.patch<Course>(
		`/courses/${encodeURIComponent(courseId)}/status`,
		{ status },
	);
	return data;
}
