import { httpClient } from "@/lib/http/client";
import type { Course } from "../../courses/course-types";

/**
 * Instructor course API.
 *
 * Endpoint contract to confirm with the backend team:
 *   GET    /courses
 *   GET    /courses/:courseId
 *   POST   /courses
 *   PATCH  /courses/:courseId
 *   DELETE /courses/:courseId
 *
 * Publication status is updated through PATCH /courses/:courseId with
 * { published: boolean }. Adjust these paths/payloads if the NestJS DTOs
 * define a different contract.
 */

export type CourseInput = Omit<Course, "id" | "published">;
export type CourseUpdateInput = Partial<CourseInput>;

export interface UpdateCoursePublicationInput {
	published: boolean;
}

/**
 * Fetch all courses visible to the authenticated instructor.
 * Pass a signal from TanStack Query to support cancellation.
 */
export async function listCourses(signal?: AbortSignal): Promise<Course[]> {
	const { data } = await httpClient.get<Course[]>("/courses", { signal });
	return data;
}

/** Fetch a single course by its server-generated ID. */
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

/** Create a course. New courses should normally start as unpublished. */
export async function createCourse(input: CourseInput): Promise<Course> {
	const { data } = await httpClient.post<Course>("/courses", input);
	return data;
}

/** Update editable course fields without changing its publication status. */
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

/** Delete a course. The server must enforce instructor ownership/permissions. */
export async function deleteCourse(courseId: string): Promise<void> {
	await httpClient.delete(`/courses/${encodeURIComponent(courseId)}`);
}

/**
 * Publish or hide a course.
 * The backend must enforce that hidden/unpublished courses are not available
 * to learners; hiding them in the frontend alone is not sufficient.
 */
export async function updateCoursePublicationStatus(
	courseId: string,
	published: boolean,
): Promise<Course> {
	const input: UpdateCoursePublicationInput = { published };
	const { data } = await httpClient.patch<Course>(
		`/courses/${encodeURIComponent(courseId)}`,
		input,
	);
	return data;
}
