import { httpClient } from "@/lib/http/client";
import type {
	EnrollmentCompletionResponse,
	EnrollmentRosterResponse,
	LecturerStudentProgress,
	RosterQuery,
} from "../types/instructor-enrollment.types";

export async function getCourseRoster(
	courseId: string,
	query: RosterQuery = {},
	signal?: AbortSignal,
): Promise<EnrollmentRosterResponse> {
	const { data } = await httpClient.get<EnrollmentRosterResponse>(
		`/courses/${encodeURIComponent(courseId)}/enrollments`,
		{
			params: query,
			signal,
		},
	);
	return data;
}

export async function completeEnrollment(
	courseId: string,
	enrollmentId: string,
): Promise<EnrollmentCompletionResponse> {
	const { data } = await httpClient.patch<EnrollmentCompletionResponse>(
		`/courses/${encodeURIComponent(courseId)}/enrollments/${encodeURIComponent(enrollmentId)}/complete`,
	);
	return data;
}

export async function getStudentProgress(
	courseId: string,
	enrollmentId: string,
	signal?: AbortSignal,
): Promise<LecturerStudentProgress> {
	const { data } = await httpClient.get<LecturerStudentProgress>(
		`/courses/${encodeURIComponent(courseId)}/enrollments/${encodeURIComponent(enrollmentId)}/progress`,
		{ signal },
	);
	return data;
}
