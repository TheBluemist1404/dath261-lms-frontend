import { httpClient } from "@/lib/http/client";
import type {
	EnrollmentActionResponseDto,
	EnrollmentStateResponseDto,
	PaginatedMyCoursesResponseDto,
	ResumePositionResponseDto,
	StudentProgressResponseDto,
} from "../types/enrollment.types";
import type { MyCoursesFilters } from "./enrollment.queries";

export async function enrollInCourse(
	courseId: string,
): Promise<EnrollmentActionResponseDto> {
	const { data } = await httpClient.post<EnrollmentActionResponseDto>(
		`/courses/${encodeURIComponent(courseId)}/enrollments/me`,
	);
	return data;
}

export async function leaveCourse(
	courseId: string,
): Promise<EnrollmentActionResponseDto> {
	const { data } = await httpClient.delete<EnrollmentActionResponseDto>(
		`/courses/${encodeURIComponent(courseId)}/enrollments/me`,
	);
	return data;
}

export async function getCourseEnrollmentState(
	courseId: string,
	signal?: AbortSignal,
): Promise<EnrollmentStateResponseDto> {
	const { data } = await httpClient.get<EnrollmentStateResponseDto>(
		`/courses/${encodeURIComponent(courseId)}/enrollments/me`,
		{ signal },
	);
	return data;
}

export async function getMyEnrollments(
	filters: MyCoursesFilters = {},
	signal?: AbortSignal,
): Promise<PaginatedMyCoursesResponseDto> {
	const { data } = await httpClient.get<PaginatedMyCoursesResponseDto>(
		"/users/me/enrollments",
		{ params: filters, signal },
	);
	return data;
}

export async function getResumePosition(
	courseId: string,
	signal?: AbortSignal,
): Promise<ResumePositionResponseDto> {
	const { data } = await httpClient.get<ResumePositionResponseDto>(
		`/courses/${encodeURIComponent(courseId)}/progress/resume`,
		{ signal },
	);
	return data;
}

export async function getStudentProgress(
	courseId: string,
	signal?: AbortSignal,
): Promise<StudentProgressResponseDto> {
	const { data } = await httpClient.get<StudentProgressResponseDto>(
		`/courses/${encodeURIComponent(courseId)}/progress`,
		{ signal },
	);
	return data;
}
