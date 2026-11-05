import { queryOptions, useQuery } from "@tanstack/react-query";
import {
	getCourseEnrollmentState,
	getMyEnrollments,
	getResumePosition,
	getStudentProgress,
} from "./enrollment.api";

export interface MyCoursesFilters {
	page?: number;
	limit?: number;
	state?: "IN_PROGRESS" | "UNAVAILABLE" | "COMPLETED";
}

export const enrollmentKeys = {
	all: ["enrollments"] as const,
	course: (courseId: string) =>
		[...enrollmentKeys.all, "course", courseId] as const,
	myLists: () => [...enrollmentKeys.all, "my"] as const,
	myList: (filters?: MyCoursesFilters) =>
		[...enrollmentKeys.myLists(), filters ?? {}] as const,
};

export const progressKeys = {
	all: ["progress"] as const,
	course: (courseId: string) =>
		[...progressKeys.all, "course", courseId] as const,
	resume: (courseId: string) =>
		[...progressKeys.all, "resume", courseId] as const,
};

export function courseEnrollmentOptions(courseId: string) {
	return queryOptions({
		queryKey: enrollmentKeys.course(courseId),
		queryFn: ({ signal }) => getCourseEnrollmentState(courseId, signal),
		enabled: Boolean(courseId),
	});
}

export function useCourseEnrollment(
	courseId: string,
	options?: { enabled?: boolean },
) {
	return useQuery({
		...courseEnrollmentOptions(courseId),
		enabled: Boolean(courseId) && (options?.enabled ?? true),
	});
}

export function myCoursesOptions(filters: MyCoursesFilters = {}) {
	return queryOptions({
		queryKey: enrollmentKeys.myList(filters),
		queryFn: ({ signal }) => getMyEnrollments(filters, signal),
	});
}

export function useMyCourses(
	filters: MyCoursesFilters = {},
	options?: { enabled?: boolean },
) {
	return useQuery({
		...myCoursesOptions(filters),
		enabled: options?.enabled ?? true,
	});
}

export function resumePositionOptions(courseId: string) {
	return queryOptions({
		queryKey: progressKeys.resume(courseId),
		queryFn: ({ signal }) => getResumePosition(courseId, signal),
		enabled: Boolean(courseId),
	});
}

export function useResumePosition(
	courseId: string,
	options?: { enabled?: boolean },
) {
	return useQuery({
		...resumePositionOptions(courseId),
		enabled: Boolean(courseId) && (options?.enabled ?? true),
	});
}

export function studentProgressOptions(courseId: string) {
	return queryOptions({
		queryKey: progressKeys.course(courseId),
		queryFn: ({ signal }) => getStudentProgress(courseId, signal),
		enabled: Boolean(courseId),
	});
}

export function useStudentProgress(
	courseId: string,
	options?: { enabled?: boolean },
) {
	return useQuery({
		...studentProgressOptions(courseId),
		enabled: Boolean(courseId) && (options?.enabled ?? true),
	});
}
