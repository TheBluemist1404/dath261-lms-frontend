import {
	queryOptions,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import type {
	EnrollmentCompletionResponse,
	RosterQuery,
} from "../types/instructor-enrollment.types";
import {
	completeEnrollment,
	getCourseRoster,
	getStudentProgress,
} from "./instructor-enrollment.api";

export const instructorEnrollmentKeys = {
	all: ["instructor-enrollments"] as const,
	rosterPrefix: (courseId: string) =>
		[...instructorEnrollmentKeys.all, "roster", courseId] as const,
	roster: (courseId: string, query: RosterQuery) =>
		[...instructorEnrollmentKeys.rosterPrefix(courseId), query] as const,
	studentProgress: (courseId: string, enrollmentId: string) =>
		[
			...instructorEnrollmentKeys.all,
			"student-progress",
			courseId,
			enrollmentId,
		] as const,
};

export function courseRosterOptions(courseId: string, query: RosterQuery) {
	return queryOptions({
		queryKey: instructorEnrollmentKeys.roster(courseId, query),
		queryFn: ({ signal }: { signal: AbortSignal }) =>
			getCourseRoster(courseId, query, signal),
		enabled: Boolean(courseId),
	});
}

export function useCourseRoster(courseId: string, query: RosterQuery) {
	return useQuery(courseRosterOptions(courseId, query));
}

export function studentProgressOptions(courseId: string, enrollmentId: string) {
	return queryOptions({
		queryKey: instructorEnrollmentKeys.studentProgress(courseId, enrollmentId),
		queryFn: ({ signal }: { signal: AbortSignal }) =>
			getStudentProgress(courseId, enrollmentId, signal),
		enabled: Boolean(courseId) && Boolean(enrollmentId),
	});
}

export function useStudentProgress(courseId: string, enrollmentId: string) {
	return useQuery(studentProgressOptions(courseId, enrollmentId));
}

export function useCompleteEnrollment() {
	const queryClient = useQueryClient();

	return useMutation<
		EnrollmentCompletionResponse,
		Error,
		{ courseId: string; enrollmentId: string }
	>({
		mutationFn: ({
			courseId,
			enrollmentId,
		}: {
			courseId: string;
			enrollmentId: string;
		}) => completeEnrollment(courseId, enrollmentId),
		onSuccess: async (
			_result: EnrollmentCompletionResponse,
			variables: { courseId: string; enrollmentId: string },
		) => {
			await queryClient.invalidateQueries({
				queryKey: instructorEnrollmentKeys.rosterPrefix(variables.courseId),
			});
		},
	});
}
