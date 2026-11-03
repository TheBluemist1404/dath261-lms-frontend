import { httpClient } from "@/lib/http/client";
import type {
	CatalogQuery,
	Course,
	CourseInput,
	CoursePage,
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
 * Public catalog read: published, non-suspended courses, paginated. Guests
 * call it without a session, so a 401 here must not start the refresh flow.
 */
export async function listPublishedCourses(
	query: CatalogQuery = {},
	signal?: AbortSignal,
): Promise<CoursePage> {
	const { enrollmentOpen, ...rest } = query;
	const params =
		enrollmentOpen === undefined
			? rest
			: { ...rest, enrollmentOpen: String(enrollmentOpen) };
	const { data } = await httpClient.get<CoursePage>("/courses/catalog", {
		params,
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

/**
 * The backend rejects unknown body fields, and status is not a course field:
 * new courses always start as DRAFT, and publication changes go through
 * PATCH /courses/:courseId/status.
 */
export async function createCourse(input: CourseInput): Promise<Course> {
	const { status: _status, ...fields } = input;
	const { data } = await httpClient.post<Course>("/courses", fields);
	return data;
}

export async function updateCourse(
	courseId: string,
	input: CourseUpdateInput,
): Promise<Course> {
	const { status, ...fields } = input;
	const { data } = await httpClient.patch<Course>(
		`/courses/${encodeURIComponent(courseId)}`,
		fields,
	);
	if (status === undefined || status === data.status) return data;
	return updateCourseStatus(courseId, status);
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
