import { httpClient } from "@/lib/http/client";
import type {
	BlockProgressMutationResponseDto,
	EnrollmentActionResponseDto,
	EnrollmentStateResponseDto,
	PaginatedMyCoursesResponseDto,
	ResumeData,
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

function blockPath(courseId: string, blockId: string) {
	return `/courses/${encodeURIComponent(courseId)}/blocks/${encodeURIComponent(blockId)}`;
}

/** Marks a TEXT, VIDEO or FILE block complete (or not) for the signed-in student. */
export async function updateBlockCompletion(
	courseId: string,
	blockId: string,
	completed: boolean,
): Promise<BlockProgressMutationResponseDto> {
	const { data } = await httpClient.patch<BlockProgressMutationResponseDto>(
		`${blockPath(courseId, blockId)}/progress`,
		{ completed },
	);
	return data;
}

/** Saves the block the student is on (and, for videos, the playback time) for "Resume". */
export async function updateLearningPosition(
	courseId: string,
	blockId: string,
	resumeData: ResumeData | null,
): Promise<BlockProgressMutationResponseDto> {
	const { data } = await httpClient.patch<BlockProgressMutationResponseDto>(
		`${blockPath(courseId, blockId)}/position`,
		{ resumeData },
	);
	return data;
}
